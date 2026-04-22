import type { Metadata } from "next";

export const metadata: Metadata = {
      title: `Data Deletion Instructions | ${process.env.NEXT_PUBLIC_SHOP_NAME || "Shop"}`,
      description: `User data deletion instructions for ${process.env.NEXT_PUBLIC_SHOP_NAME || "our shop"}`,
};

export default function DataDeletionPage() {
      return (
              <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                    User Data Deletion Instructions
            </h1>
                  <p className="text-sm text-gray-500 mb-8 text-center">
                    Last updated: March 4, 2026
            </p>
                  <section className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Deleting Your Data</h2>
                    <p className="text-gray-600 leading-relaxed mb-4">
                       We respect your privacy rights. You can request deletion of all your
                personal data at any time by following the steps below.
                              </p>
                            </section>
                            <section className="mb-8">
                              <h2 className="text-xl font-semibold text-gray-800 mb-4">How to Request Data Deletion</h2>
                              <div className="space-y-6">
                                <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg">
                                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                                  <div>
                                    <h3 className="font-semibold text-gray-800 mb-1">Remove Activity from Facebook</h3>
                                    <p className="text-gray-600 text-sm">
                                                          Go to your Facebook Settings &gt; Apps and Websites &gt; Find &quot;My Website Login&quot; &gt; Click &quot;Remove&quot;
                    </p>
                                  </div>
                                </div>
                                <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg">
                                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                                  <div>
                                    <h3 className="font-semibold text-gray-800 mb-1">Send Email Request</h3>
                                    <p className="text-gray-600 text-sm">
                                      Send an email to <a href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@example.com'}`} className="text-blue-600 underline">{process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@example.com'}</a> with
                                      subject &quot;Delete My Personal Data&quot; and include your Facebook account name.
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg">
                                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                                  <div>
                                    <h3 className="font-semibold text-gray-800 mb-1">Contact via Facebook Messenger</h3>
                                    <p className="text-gray-600 text-sm">Send us a message requesting data deletion through our Facebook Page.</p>
                                  </div>
                                </div>
                              </div>
                            </section>
                            <section className="mb-8">
                              <h2 className="text-xl font-semibold text-gray-800 mb-4">Data That Will Be Deleted</h2>
                              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                                <li>Profile information (name, email, phone number)</li>
                                <li>Data received from Facebook (profile name, photo, Facebook User ID)</li>
                                <li>Messenger conversation history</li>
                                <li>Order history and shipping address information</li>
                                <li>Preferences and notification settings</li>
                              </ul>
                            </section>
                            <section className="mb-8">
                              <h2 className="text-xl font-semibold text-gray-800 mb-4">Processing Time</h2>
                              <p className="text-gray-600 leading-relaxed">
                                We will process your data deletion request within <strong>30 days</strong> from the date
                                we receive your request. You will receive a confirmation via email or Messenger when the
                                process is complete.
                              </p>
                            </section>
                            <section className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <h2 className="text-xl font-semibold text-gray-800 mb-3">Important Notes</h2>
                              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                                <li>Some data may be retained as required by law (e.g., financial transaction records).</li>
                                <li>Data deletion will result in loss of access to your account and previous order history.</li>
                                <li>If you wish to use our services again, you will need to create a new account.</li>
                              </ul>
                            </section>
                            <section>
                              <h2 className="text-xl font-semibold text-gray-800 mb-4">Contact Us</h2>
                              <p className="text-gray-600 leading-relaxed">
                                If you have questions about data deletion, please contact us at:
                              </p>
                              <ul className="list-none text-gray-600 space-y-2 mt-3 ml-4">
                                <li>Email: <a href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@example.com'}`} className="text-blue-600 hover:text-blue-800 underline">{process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@example.com'}</a></li>
                    </ul>
                            </section>
                          </div>
                        </div>
                      );
                    }
                    
