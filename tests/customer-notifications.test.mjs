import assert from 'node:assert/strict';
import test from 'node:test';
import { customerNotifications, notificationReadKey } from '../src/lib/customer-notifications.ts';

const user = { id: 'customer-a', email: 'a@example.test', username: 'A', role: 'customer' };
const date = '2026-10-14T01:00:00.000Z';
const transaction = { id: 'credit', customer_id: user.id, customer_email: user.email, type: 'credit', points: 100, description: 'ORDER-A', created_at: date };
const order = { id: 'order', customer_id: user.id, customer_email: user.email, order_number: 'ORDER-A', status: 'pending', created_at: date, reviewed_at: null };
const gift = { id: 'gift', customer_email: user.email, request_code: 'GIFT-A', product_name: 'Phone', status: 'pending', created_at: date, updated_at: date };

test('notification feed rejects other accounts even when ID and email disagree, and handles legacy own ledger rows', () => {
  const rows = customerNotifications(user, [transaction, { ...transaction, id: 'foreign', customer_id: 'other' }, { ...transaction, id: 'legacy', customer_id: null }, { ...transaction, id: 'foreign-legacy', customer_id: null, customer_email: 'other@example.test' }], [order, { ...order, id: 'foreign-order', customer_id: 'other' }], [gift, { ...gift, id: 'foreign-gift', customer_email: 'other@example.test' }]);
  assert.equal(rows.length, 4);
  assert.ok(rows.every(row => !row.id.includes('foreign')));
  assert.equal(customerNotifications({ ...user, id: 'other', email: 'other@example.test' }, [transaction], [order], [gift]).length, 0);
  assert.equal(customerNotifications({ ...user, email: '' }, [{ ...transaction, customer_id: null, customer_email: '' }], [], [{ ...gift, customer_email: '' }]).length, 0);
});

test('credits, debits, review results and delivery updates are real, ordered and link to relevant customer pages', () => {
  const later = '2026-10-14T02:00:00.000Z';
  const rows = customerNotifications(user, [transaction, { ...transaction, id: 'debit', type: 'debit', points: 50 }], [{ ...order, status: 'rejected', reviewed_at: later, review_note: 'Check number' }], [{ ...gift, product_name: 'Deleted product snapshot', status: 'completed' }]);
  assert.equal(rows[0].titleKey, 'order_rejected');
  assert.equal(rows[0].date, later);
  assert.equal(rows[0].note, 'Check number');
  assert.equal(rows.find(row => row.titleKey === 'points_debit').values.points, 50);
  assert.equal(rows.find(row => row.titleKey === 'gift_completed').href, '/redemptions');
  assert.match(rows.find(row => row.titleKey === 'gift_completed').detail, /Deleted product snapshot/);
  assert.ok(rows.every(row => ['/redemptions', '/points-exchange'].includes(row.href)));
});

test('read identifiers are stable on refresh, new status changes are unread, and accounts have separate read storage', () => {
  const first = customerNotifications(user, [transaction], [order], [gift]);
  const refreshed = customerNotifications(user, [transaction, transaction], [order], [gift]);
  assert.deepEqual(first, refreshed);
  const seen = new Set(first.map(row => row.id));
  const updated = customerNotifications(user, [transaction], [{ ...order, status: 'approved', reviewed_at: '2026-10-14T03:00:00.000Z' }], [{ ...gift, status: 'processing' }]);
  assert.equal(updated.filter(row => !seen.has(row.id)).length, 2);
  assert.notEqual(notificationReadKey(user.id), notificationReadKey('customer-b'));
  assert.deepEqual(customerNotifications(user, [], [], []), []);
});
