import { Route, BrowserRouter as Router, Routes } from "react-router";
import { ScrollToTop } from "./components/common/ScrollToTop";
import AppLayout from "./layout/AppLayout";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import RewardsHub from "./pages/Rewards/RewardsHub";
import Redemptions from "./pages/Rewards/Redemptions";
import AdminCustomers from "./pages/Rewards/AdminCustomers";
import AdminProducts from "./pages/Rewards/AdminProducts";
import AdminCategories from "./pages/Rewards/AdminCategories";
import AdminRedemptions from "./pages/Rewards/AdminRedemptions";
import PointsExchange from "./pages/Rewards/PointsExchange";
import AdminOrderPoints from "./pages/Rewards/AdminOrderPoints";
import ContactUs from "./pages/Rewards/ContactUs";
import RequireAuth from "./components/auth/RequireAuth";

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Dashboard Layout */}
          <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index path="/" element={<RewardsHub />} />
            <Route path="/rewards" element={<RewardsHub />} />
            <Route path="/points-exchange" element={<PointsExchange />} />
            <Route path="/redemptions" element={<Redemptions />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route element={<RequireAuth admin />}>
            <Route path="/admin/messages" element={<ContactUs forReview />} />
            <Route path="/admin/customers" element={<AdminCustomers />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin/redemptions" element={<AdminRedemptions />} />
            <Route path="/admin/order-points" element={<AdminOrderPoints />} />
            </Route>

            {/* Others Page */}
            <Route path="/profile" element={<UserProfiles />} />

            {/* Forms */}

            {/* Tables */}

            {/* Ui Elements */}

            {/* Charts */}
          </Route>

          </Route>
          {/* Auth Layout */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
