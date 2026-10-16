"""Explicit remote SQL tests: all fixture users and business rows are rolled back.

Run only after all migrations in scripts/supabase_db.py have been applied.
Run manually with the same private config and driver as scripts/supabase_db.py.
No emails, Auth registrations, or persistent business records are created.
"""
import json
import sys
import unittest
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from supabase_db import connect  # noqa: E402

class DatabaseWorkflow(unittest.TestCase):
    def setUp(self):
        self.conn = connect()
        self.addCleanup(self.conn.close)
        self.addCleanup(self.conn.rollback)
        self.admin, self.customer, self.other = [str(uuid4()) for _ in range(3)]
        for uid, role in [(self.admin, 'admin'), (self.customer, 'customer'), (self.other, 'customer')]:
            self.conn.execute('insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data) values(%s,%s,%s::jsonb,%s::jsonb)',
                              (uid, uid+'@example.test', json.dumps({'name':'SQL test', 'shipping_address': {'recipient':'SQL test','phone':'123','country':'Test','city':'Test','line1':'Example street','line2':'','region':'','postalCode':''}}), json.dumps({'role':role})))
        self.product = str(self.conn.execute("insert into public.products(name,category,points,status,variants,options) values ('SQL test phone','Apple',100,'published',%s::jsonb,%s::jsonb) returning id", (
            json.dumps([{'id':'pro','name':'Pro / 256GB','points':100},{'id':'max','name':'Pro Max / 512GB','points':200}]),
            json.dumps([{'id':'color','name':'Color','values':['Blue','Black']}]),
        )).fetchone()[0])
        self.actor(self.admin, 'admin')
        self.adjust(self.customer, 500)
        self.actor(self.customer)

    def actor(self, uid, role='customer'):
        self.conn.execute('reset role')
        self.conn.execute("select set_config('request.jwt.claims',%s,true)", (json.dumps({'sub':uid,'role':'authenticated','email':uid+'@example.test','app_metadata':{'role':role}}),))
        self.conn.execute('set local role authenticated')

    def adjust(self, uid, points, op=None, kind='credit'):
        return self.conn.execute('select public.adjust_customer_points(%s,%s,%s,%s,%s)', (uid,kind,points,'test',op or str(uuid4()))).fetchone()[0]

    def redeem(self, op=None, points=100, variant='pro', choices=None):
        return self.conn.execute('select to_jsonb(public.redeem_gift(%s,%s,%s,%s::jsonb,%s))',
            (self.product,variant,points,json.dumps(choices if choices is not None else [{'optionId':'color','value':'Blue'}]),op or str(uuid4()))).fetchone()[0]

    def status(self, rid, status, note='test reason'):
        return self.conn.execute('select to_jsonb(public.set_gift_request_status(%s,%s,%s))', (rid,status,note)).fetchone()[0]

    def balance(self):
        return self.conn.execute("select coalesce(sum(case when type='credit' then points else -points end),0) from public.point_transactions").fetchone()[0]

    def fails(self, expected, action):
        with self.assertRaisesRegex(Exception, expected):
            with self.conn.transaction():
                action()

    def test_retry_and_refund_once(self):
        op = str(uuid4())
        first = self.redeem(op)
        self.assertEqual(first['id'], self.redeem(op)['id'])
        self.assertEqual(self.balance(),400)
        self.fails('adjustmentConflict', lambda:self.redeem(op,200,'max'))
        self.fails('resolutionRequired', lambda:self.status(first['id'],'cancelled',''))
        pending = self.status(first['id'],'cancelled')
        self.assertEqual(pending['status'],'cancel_requested')
        self.assertEqual(self.balance(),400)
        self.actor(self.admin,'admin')
        cancelled = self.status(first['id'],'cancelled')
        self.assertEqual(len(cancelled['status_history']),3)
        self.assertIsNotNone(cancelled['refunded_at'])
        self.status(first['id'],'cancelled')
        self.actor(self.customer)
        self.assertEqual(self.balance(),500)
        self.assertEqual(self.redeem(op)['status'],'cancelled')
        self.actor(self.admin,'admin')
        self.fails('redemptionState',lambda:self.status(first['id'],'processing'))

    def test_validation_and_transaction_rollback(self):
        self.fails('priceChanged',lambda:self.redeem(points=1))
        self.fails('variantUnavailable',lambda:self.redeem(variant='missing'))
        self.fails('optionUnavailable',lambda:self.redeem(choices=[]))
        self.fails('optionUnavailable',lambda:self.redeem(choices=[{'optionId':'color','value':'Red'}]))
        self.actor(self.other)
        self.fails('insufficient',lambda:self.redeem())
        self.assertEqual(self.conn.execute('select count(*) from public.redemption_requests').fetchone()[0],0)
        self.assertEqual(self.balance(),0)

    def test_permissions_and_owner_isolation(self):
        request = self.redeem()
        self.fails('permission denied',lambda:self.conn.execute("insert into public.point_transactions(customer_email,description,points,type) values('x','x',999,'credit')"))
        self.fails('permission denied',lambda:self.conn.execute("update public.redemption_requests set status='completed'"))
        self.fails('row-level security',lambda:self.conn.execute("insert into public.products(name,category,points) values('forged','Apple',1)"))
        self.fails('forbidden',lambda:self.adjust(self.customer,100))
        self.fails('forbidden',lambda:self.status(request['id'],'completed'))
        self.actor(self.other)
        self.assertEqual(self.conn.execute('select count(*) from public.redemption_requests').fetchone()[0],0)
        self.assertEqual(self.balance(),0)
        self.fails('forbidden',lambda:self.status(request['id'],'cancelled'))
        self.actor(self.admin,'admin')
        self.assertEqual(self.conn.execute('select count(*) from public.redemption_requests where customer_id=%s', (self.customer,)).fetchone()[0],1)
        self.fails('permission denied',lambda:self.conn.execute('delete from public.point_transactions'))

    def test_review_edit_credit_and_repeat(self):
        order = self.conn.execute('select to_jsonb(r) from public.submit_order_point_request(%s) r',('TEST-'+str(uuid4()),)).fetchone()[0]
        old = order['order_number']
        new = old+'-EDIT'
        self.conn.execute('select public.update_order_point_request(%s,%s)',(order['id'],new))
        self.actor(self.admin,'admin')
        self.fails('order_points_changed',lambda:self.conn.execute('select public.review_current_order_point_request(%s,true,200,%s,%s)',(order['id'],'checked',old)))
        self.conn.execute('select public.review_current_order_point_request(%s,true,200,%s,%s)',(order['id'],'checked',new))
        self.fails('order_points_already_reviewed',lambda:self.conn.execute('select public.review_current_order_point_request(%s,true,200,%s,%s)',(order['id'],'checked',new)))
        self.actor(self.customer)
        self.assertEqual(self.balance(),700)
        self.fails('order_points_already_reviewed',lambda:self.conn.execute('select public.update_order_point_request(%s,%s)',(order['id'],old)))

    def test_admin_rejection_and_completed_terminal(self):
        request=self.redeem()
        self.actor(self.admin,'admin')
        self.status(request['id'],'processing')
        self.actor(self.customer)
        self.assertEqual(self.status(request['id'],'cancelled')['status'],'cancel_requested')
        self.assertEqual(self.balance(),400)
        self.actor(self.admin,'admin')
        self.status(request['id'],'processing','Cancellation declined')
        self.status(request['id'],'rejected')
        self.status(request['id'],'rejected')
        self.actor(self.customer)
        self.assertEqual(self.balance(),500)
        second=self.redeem()
        self.actor(self.admin,'admin')
        self.status(second['id'],'completed')
        self.fails('redemptionState',lambda:self.status(second['id'],'rejected'))
        self.actor(self.customer)
        self.assertEqual(self.balance(),400)

    def test_adjustment_retry_and_overdraft(self):
        self.actor(self.admin,'admin')
        op=str(uuid4())
        first=self.adjust(self.customer,100,op)
        self.assertEqual(first['id'],self.adjust(self.customer,100,op)['id'])
        self.fails('adjustmentConflict',lambda:self.adjust(self.customer,101,op))
        self.fails('insufficient',lambda:self.adjust(self.customer,601,kind='debit'))
        self.actor(self.customer)
        self.assertEqual(self.balance(),600)

    def test_notifications_merge_and_isolation(self):
        self.conn.execute('select public.mark_notifications_read(%s)',(['first','second'],))
        ids=self.conn.execute('select public.mark_notifications_read(%s)',(['second','third'],)).fetchone()[0]
        self.assertEqual(set(ids),{'first','second','third'})
        self.actor(self.other)
        self.assertEqual(self.conn.execute('select count(*) from public.notification_reads').fetchone()[0],0)
        self.conn.execute('select public.mark_notifications_read(%s)',(['other'],))
        self.actor(self.customer)
        self.assertEqual(self.conn.execute('select count(*) from public.notification_reads').fetchone()[0],3)

    def test_draft_delete_preserves_request(self):
        request=self.redeem()
        self.actor(self.admin,'admin')
        self.conn.execute('delete from public.products where id=%s',(self.product,))
        self.assertEqual(self.conn.execute('select count(*) from public.products where id=%s',(self.product,)).fetchone()[0],1)
        self.conn.execute("update public.products set status='draft' where id=%s",(self.product,))
        self.conn.execute('delete from public.products where id=%s',(self.product,))
        record=self.conn.execute('select product_id,product_name from public.redemption_requests where id=%s',(request['id'],)).fetchone()
        self.assertEqual(record,(None,'SQL test phone'))
        self.status(request['id'],'rejected')
        self.actor(self.customer)
        self.assertEqual(self.balance(),500)

    def test_anonymous_access_is_denied(self):
        self.conn.execute('reset role')
        self.conn.execute("select set_config('request.jwt.claims','{}',true)")
        self.conn.execute('set local role anon')
        self.fails('permission denied',lambda:self.conn.execute('select * from public.point_transactions'))
        self.fails('permission denied',lambda:self.conn.execute('select * from public.redemption_requests'))
        self.fails('permission denied',lambda:self.redeem())
        self.fails('permission denied',lambda:self.conn.execute("select public.mark_notifications_read(array['x'])"))

    def test_shipping_address_requires_admin_and_only_returns_address_fields(self):
        address = {'recipient': 'SQL test', 'phone': '123', 'country': 'Test', 'region': '',
                   'city': 'Test', 'postalCode': '', 'line1': 'Test street', 'line2': '', 'extra': 'not exposed'}
        self.conn.execute('reset role')
        self.conn.execute("update auth.users set raw_user_meta_data=raw_user_meta_data || %s::jsonb where id=%s",
                          (json.dumps({'shipping_address': address}), self.customer))
        self.actor(self.customer)
        self.fails('forbidden', lambda: self.conn.execute('select public.get_admin_customer_shipping_address(%s)', (self.customer,)))
        self.actor(self.admin, 'admin')
        result = self.conn.execute('select public.get_admin_customer_shipping_address(%s)', (self.customer,)).fetchone()[0]
        self.assertEqual(result, {key: value for key, value in address.items() if key != 'extra'})

    def test_avatar_storage_only_allows_own_folder(self):
        own = self.customer + '/' + str(uuid4()) + '.png'
        other = self.other + '/' + str(uuid4()) + '.png'
        self.conn.execute("insert into storage.objects(bucket_id,name) values('customer-avatars',%s)", (own,))
        self.fails('row-level security', lambda: self.conn.execute("insert into storage.objects(bucket_id,name) values('customer-avatars',%s)", (other,)))
        self.assertEqual(self.conn.execute("select count(*) from storage.objects where bucket_id='customer-avatars' and name=%s", (own,)).fetchone()[0], 1)
        self.actor(self.other)
        self.assertEqual(self.conn.execute("select count(*) from storage.objects where bucket_id='customer-avatars' and name=%s", (own,)).fetchone()[0], 0)
        # Supabase blocks SQL DELETE even before row filtering. App cleanup uses
        # the Storage HTTP API; do not bypass that guard in this SQL-only test.
        self.fails('Use the Storage API', lambda: self.conn.execute("delete from storage.objects where bucket_id='customer-avatars' and name=%s", (own,)))
        self.actor(self.customer)
        self.assertEqual(self.conn.execute("select count(*) from storage.objects where bucket_id='customer-avatars' and name=%s", (own,)).fetchone()[0], 1)
        self.fails('Use the Storage API', lambda: self.conn.execute("delete from storage.objects where bucket_id='customer-avatars' and name=%s", (own,)))
        # The surrounding transaction rolls the fixture back; no object is committed.

    def test_checkout_requires_address_and_preserves_note_and_snapshot(self):
        self.conn.execute('reset role')
        self.conn.execute("update auth.users set raw_user_meta_data=raw_user_meta_data-'shipping_address' where id=%s", (self.customer,))
        self.actor(self.customer)
        self.fails('shippingRequired', lambda: self.redeem())
        self.assertEqual(self.balance(),500)
        address={'recipient':'SQL test','phone':'123','country':'Test','city':'Test','line1':'Example street','line2':'','region':'','postalCode':'','extra':'private'}
        self.conn.execute('reset role')
        self.conn.execute("update auth.users set raw_user_meta_data=raw_user_meta_data || %s::jsonb where id=%s", (json.dumps({'shipping_address':address}),self.customer))
        self.actor(self.customer)
        args=(self.product,'pro',100,json.dumps([{'optionId':'color','value':'Blue'}]),str(uuid4()),'Please pack carefully')
        request=self.conn.execute('select to_jsonb(public.redeem_gift(%s,%s,%s,%s::jsonb,%s,%s))',args).fetchone()[0]
        self.assertEqual(request['customer_note'],args[-1])
        self.assertNotIn('extra',request['shipping_address'])
        self.assertEqual(request['shipping_address']['city'],'Test')
        self.fails('forbidden',lambda:self.conn.execute("select public.reply_gift_request(%s,'forged')",(request['id'],)))
        self.actor(self.admin,'admin')
        self.conn.execute("select public.reply_gift_request(%s,'Reply')",(request['id'],))
        self.actor(self.customer)
        self.assertEqual(self.conn.execute('select admin_reply from public.redemption_requests where id=%s',(request['id'],)).fetchone()[0],'Reply')

    def test_contact_privacy_retries_reply_and_delete(self):
        op=str(uuid4())
        sql='select to_jsonb(public.submit_contact_message(%s,%s))'
        row=self.conn.execute(sql,('Private message',op)).fetchone()[0]
        self.assertEqual(self.conn.execute(sql,('Private message',op)).fetchone()[0]['id'],row['id'])
        self.fails('adjustmentConflict',lambda:self.conn.execute(sql,('Changed message',op)))
        self.fails('forbidden',lambda:self.conn.execute("select public.reply_contact_message(%s,'Forged')",(row['id'],)))
        self.fails('forbidden',lambda:self.conn.execute('select public.delete_contact_message(%s)',(row['id'],)))
        self.fails('permission denied',lambda:self.conn.execute("update public.contact_messages set reply='Forged'"))
        self.actor(self.other)
        self.assertEqual(self.conn.execute('select count(*) from public.contact_messages where id=%s',(row['id'],)).fetchone()[0],0)
        self.actor(self.admin,'admin')
        self.conn.execute("select public.reply_contact_message(%s,'Reply')",(row['id'],))
        self.actor(self.customer)
        self.assertEqual(self.conn.execute('select reply from public.contact_messages where id=%s',(row['id'],)).fetchone()[0],'Reply')
        self.actor(self.admin,'admin')
        self.conn.execute('select public.delete_contact_message(%s)',(row['id'],))
        self.actor(self.customer)
        self.assertEqual(self.conn.execute('select count(*) from public.contact_messages where id=%s',(row['id'],)).fetchone()[0],0)

    def test_concurrent_duplicate_waits_for_operation_lock(self):
        op=str(uuid4())
        request=self.redeem(op)
        # A second DB session must wait before checking the first uncommitted request.
        # Fixture users/products never need to be committed to test this boundary.
        with connect() as other_conn:
            other_conn.execute("select set_config('request.jwt.claims',%s,true)", (json.dumps({'sub':self.customer,'role':'authenticated','app_metadata':{'role':'customer'}}),))
            other_conn.execute('set local role authenticated')
            other_conn.execute("set local lock_timeout='1s'")
            with self.assertRaisesRegex(Exception,'lock timeout'):
                with other_conn.transaction():
                    other_conn.execute('select public.redeem_gift(%s,%s,%s,%s::jsonb,%s)',(self.product,'pro',100,json.dumps([{'optionId':'color','value':'Blue'}]),op))
        self.assertEqual(self.redeem(op)['id'],request['id'])
        self.assertEqual(self.balance(),400)

if __name__ == '__main__':
    unittest.main(verbosity=2)
