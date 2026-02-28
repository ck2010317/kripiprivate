export const metadata = {
  title: "Delete Account - PrivatePay",
}

export default function DeleteAccount() {
  return (
    <div className="min-h-screen bg-[#0d0b18] text-gray-300 px-6 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">Delete Your Account</h1>
      <p className="text-gray-500 mb-8">PrivatePay Account Deletion</p>

      <section className="space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="text-lg font-semibold text-white mb-2">How to Request Account Deletion</h2>
          <p className="mb-4">
            To request deletion of your PrivatePay account and associated data, please follow these steps:
          </p>
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>Send an email to <strong className="text-white">support@privatepay.site</strong> from the email address associated with your account.</li>
            <li>Use the subject line: <strong className="text-white">&quot;Account Deletion Request&quot;</strong></li>
            <li>Include your registered email address in the body of the email.</li>
          </ol>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">What Data Will Be Deleted</h2>
          <p className="mb-2">When your account is deleted, the following data will be permanently removed:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Your account profile (name, email, password)</li>
            <li>Wallet balance and associated data</li>
            <li>Virtual card details</li>
            <li>API keys and developer settings</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">What Data May Be Retained</h2>
          <p className="mb-2">For legal and regulatory compliance, we may retain the following for up to 90 days after deletion:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Transaction history and payment records (required for financial compliance)</li>
            <li>Fraud prevention data</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">Processing Time</h2>
          <p>
            Account deletion requests are processed within <strong className="text-white">7 business days</strong>.
            You will receive a confirmation email once your account has been deleted.
          </p>
        </div>

        <div className="border-t border-gray-800 pt-6 mt-8">
          <p className="text-gray-500">
            If you have any questions, contact us at <strong className="text-white">support@privatepay.site</strong>
          </p>
        </div>
      </section>
    </div>
  )
}
