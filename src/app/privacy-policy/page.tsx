import type { Metadata } from "next";
export const metadata: Metadata = {
      title: `Privacy Policy | ${process.env.NEXT_PUBLIC_SHOP_NAME || "Shop"}`,
      description: `Privacy Policy for ${process.env.NEXT_PUBLIC_SHOP_NAME || "our shop"}`,
};
export default function PrivacyPolicyPage() {
      return (
              <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Privacy Policy</h1>
                  <p className="text-sm text-gray-500 mb-8 text-center">Last updated: March 4, 2026</p>
                  <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">1. Information We Collect</h2>
                    <p className="text-gray-600 leading-relaxed mb-3">We collect personal information that you provide to us directly when you create an account, log in through Facebook, place an order, or contact us through Facebook Messenger.</p>
                    <p className="text-gray-600 leading-relaxed">Information collected may include: name, email, phone number, shipping address, Facebook profile info, and order history.</p>
                  </section>
                  <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">2. How We Use Your Information</h2>
                    <p className="text-gray-600 leading-relaxed">We use your information to process orders, provide customer service via Messenger, send order confirmations, improve our services, and send promotional communications with your consent.</p>
                  </section>
                  <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">3. Facebook Data Usage</h2>
                    <p className="text-gray-600 leading-relaxed">When you connect your Facebook account or contact us via Messenger, we may receive your public profile information. We use this to identify you and provide better service. We do not share this with third parties without consent.</p>
                  </section>
                  <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">4. Data Sharing</h2>
                    <p className="text-gray-600 leading-relaxed">We do not sell your personal information. We may share data with trusted service providers such as delivery and payment processors.</p>
                  </section>
                  <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">5. Data Security</h2>
                    <p className="text-gray-600 leading-relaxed">We use appropriate security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction.</p>
                  </section>
                  <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">6. Your Rights</h2>
                    <p className="text-gray-600 leading-relaxed">You have the right to access, correct, or delete your personal information. You may also opt out of marketing communications at any time.</p>
                  </section>
                  <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">7. Data Deletion</h2>
                    <p className="text-gray-600 leading-relaxed">You can request deletion of all personal data at any time. Visit our data deletion page or contact us via email at {process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@example.com'}</p>
                  </section>
                  <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">8. Policy Changes</h2>
                    <p className="text-gray-600 leading-relaxed">We may update this policy from time to time. Changes are effective immediately upon publication.</p>
                  </section>
                  <section>
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">9. Contact Us</h2>
                    <p className="text-gray-600 leading-relaxed">Questions about this privacy policy? Contact us at {process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@example.com'}</p>
                  </section>
                </div>
              </div>
            );
          }
          
