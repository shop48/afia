import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-platinum-light">
      {/* Header */}
      <div className="bg-navy text-white py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-white/60 hover:text-gold text-sm mb-6 transition-colors">
            <ArrowLeft size={16} /> Back to Home
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-heading)] mb-3">
            Terms of Service
          </h1>
          <p className="text-white/60 text-sm">Last updated: 4 April 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="prose prose-navy max-w-none space-y-8" style={{ fontFamily: 'var(--font-body)', color: '#374151', lineHeight: 1.8, fontSize: '0.95rem' }}>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">1. Introduction</h2>
            <p>Welcome to Neoa ("we," "us," or "our"). These Terms of Service ("Terms") govern your access to and use of the Neoa marketplace platform, including our website, mobile applications, APIs, and all related services (collectively, the "Platform").</p>
            <p>By creating an account or using the Platform, you agree to be bound by these Terms. If you do not agree, do not use the Platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">2. Definitions</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>"Buyer"</strong> means any registered user who purchases products or services through the Platform.</li>
              <li><strong>"Vendor"</strong> means any registered user who lists, offers, sells, or provides products or services through the Platform.</li>
              <li><strong>"Order"</strong> means a transaction initiated by a Buyer to purchase a product or service from a Vendor.</li>
              <li><strong>"Escrow"</strong> means the secure holding of funds by Neoa on behalf of users, pending the fulfilment and confirmation of an Order.</li>
              <li><strong>"Commission"</strong> means the service fee charged by Neoa to Vendors on each successfully completed transaction.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">3. Eligibility</h2>
            <p>To use the Platform, you must:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Be at least 18 years of age or the legal age of majority in your jurisdiction.</li>
              <li>Have the legal capacity to enter into a binding agreement.</li>
              <li>Provide accurate, current, and complete information during registration.</li>
              <li>Not have been previously suspended or removed from the Platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">4. Account Registration</h2>
            <p>4.1. You must register for an account to access the Platform's services. You may register as a Buyer or a Vendor.</p>
            <p>4.2. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
            <p>4.3. You agree to immediately notify Neoa of any unauthorised use of your account.</p>
            <p>4.4. Neoa reserves the right to suspend or terminate accounts that violate these Terms or are suspected of fraudulent activity.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">5. Identity Verification</h2>
            <p>5.1. Vendors are required to complete an identity verification process before listing products or services. This is essential to maintain trust and safety on the Platform.</p>
            <p>5.2. Neoa uses third-party identity verification services to confirm user identities. By completing the verification process, you consent to the collection and processing of your identity documents and biometric data as described in our Privacy Policy.</p>
            <p>5.3. Neoa reserves the right to reject or revoke verification status at its discretion, particularly where fraud or misrepresentation is suspected.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">6. Escrow Payment Protection</h2>
            <p>6.1. All payments made through the Platform are processed through Neoa's escrow system. When a Buyer places an Order, the payment is held securely by Neoa and is <strong>not</strong> released to the Vendor until the Buyer confirms receipt and satisfaction.</p>
            <p>6.2. <strong>For Buyers:</strong> Your funds are protected from the moment of payment until you confirm delivery or satisfaction. If a dispute arises, your funds remain securely held until the matter is resolved.</p>
            <p>6.3. <strong>For Vendors:</strong> Once the Buyer confirms receipt and satisfaction with the Order, the payment (minus the applicable Commission) is released to your linked bank account.</p>
            <p>6.4. Neoa is not a bank and does not provide banking services. Funds held in escrow are maintained in secure, regulated accounts with licensed payment service providers.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">7. Fees and Commission</h2>
            <p>7.1. <strong>Buyers:</strong> There are no fees charged to Buyers for browsing, chatting with Vendors, or placing Orders on the Platform. The Buyer pays only the listed price of the product or service.</p>
            <p>7.2. <strong>Vendors:</strong> Neoa charges a commission of <strong>fifteen percent (15%)</strong> on each successfully completed transaction. This commission is automatically deducted from the gross transaction amount before the remaining funds (85%) are released to the Vendor.</p>
            <p>7.3. There are no monthly subscription fees, setup fees, or hidden charges. Vendors are only charged the Commission when a transaction is successfully completed.</p>
            <p>7.4. Neoa reserves the right to modify the Commission rate with at least thirty (30) days' prior written notice to Vendors. Continued use of the Platform after such notice constitutes acceptance of the revised rate.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">8. Vendor Obligations</h2>
            <p>As a Vendor on the Platform, you agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate and complete descriptions of your products and services, including prices, images, and any applicable terms.</li>
              <li>Fulfil all Orders promptly and in good faith, delivering products or services as described.</li>
              <li>Respond to Buyer inquiries in a timely and professional manner.</li>
              <li>Comply with all applicable laws and regulations in your jurisdiction, including consumer protection, tax, and trade laws.</li>
              <li>Not engage in deceptive practices, including but not limited to bait-and-switch tactics, false advertising, or misrepresentation of goods or services.</li>
              <li>Not sell prohibited items, including counterfeit goods, stolen property, illegal substances, weapons, or any items that violate applicable law.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">9. Buyer Obligations</h2>
            <p>As a Buyer on the Platform, you agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate delivery information and payment details.</li>
              <li>Confirm receipt and satisfaction with an Order promptly upon delivery or completion.</li>
              <li>Not initiate false disputes or chargebacks for Orders that have been satisfactorily fulfilled.</li>
              <li>Communicate with Vendors respectfully and in good faith.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">10. Dispute Resolution</h2>
            <p>10.1. In the event of a dispute between a Buyer and a Vendor, either party may initiate a dispute through the Platform.</p>
            <p>10.2. When a dispute is opened, the escrow-held funds remain protected while the dispute is under review.</p>
            <p>10.3. Neoa's dispute resolution team will review all evidence provided by both parties and issue a resolution. Both parties agree to cooperate fully with the investigation.</p>
            <p>10.4. Neoa's resolution is final and binding. Possible outcomes include: full release of funds to the Vendor, full refund to the Buyer, or partial release/refund as determined appropriate.</p>
            <p>10.5. Neoa reserves the right to suspend the accounts of users who repeatedly engage in disputes in bad faith.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">11. Intellectual Property</h2>
            <p>11.1. The Neoa name, logo, design system, and all Platform content (excluding user-generated content) are the intellectual property of Neoa and are protected by applicable copyright, trademark, and other intellectual property laws.</p>
            <p>11.2. Vendors retain ownership of their product images, descriptions, and other content they upload to the Platform. By uploading content, Vendors grant Neoa a non-exclusive, worldwide, royalty-free licence to use, display, and distribute such content solely for the purpose of operating the Platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">12. Prohibited Conduct</h2>
            <p>Users shall not:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Platform for any unlawful purpose.</li>
              <li>Circumvent or attempt to circumvent the escrow system.</li>
              <li>Create multiple accounts to evade suspension or enforcement actions.</li>
              <li>Scrape, harvest, or collect user data without Neoa's express written consent.</li>
              <li>Upload malware, viruses, or any harmful code to the Platform.</li>
              <li>Engage in price manipulation, wash trading, or other market manipulation tactics.</li>
              <li>Impersonate another person or entity.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">13. Limitation of Liability</h2>
            <p>13.1. Neoa acts as a marketplace intermediary and escrow service provider. We are not a party to the transaction between Buyers and Vendors, and we do not guarantee the quality, safety, legality, or fitness for purpose of any product or service listed on the Platform.</p>
            <p>13.2. To the maximum extent permitted by applicable law, Neoa shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or in connection with your use of the Platform.</p>
            <p>13.3. Neoa's total aggregate liability shall not exceed the Commission fees collected from the relevant transaction(s) at issue.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">14. Indemnification</h2>
            <p>You agree to indemnify, defend, and hold harmless Neoa, its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising out of or in connection with your use of the Platform, your violation of these Terms, or your violation of any rights of a third party.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">15. Modification of Terms</h2>
            <p>15.1. Neoa reserves the right to modify these Terms at any time. Material changes will be communicated to users via email or through a prominent notice on the Platform at least fourteen (14) days before they take effect.</p>
            <p>15.2. Your continued use of the Platform after the effective date of any modification constitutes your acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">16. Termination</h2>
            <p>16.1. You may terminate your account at any time by contacting Neoa support. Upon termination, any pending escrow funds will be processed according to the applicable Order's fulfilment status.</p>
            <p>16.2. Neoa may suspend or terminate your account immediately if you violate these Terms, engage in fraudulent activity, or pose a risk to the safety and integrity of the Platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">17. Governing Law</h2>
            <p>These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria. Any disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of Nigeria.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">18. Contact Us</h2>
            <p>If you have any questions about these Terms of Service, please contact us at:</p>
            <p><strong>Email:</strong> legal@neoahq.com</p>
            <p><strong>Website:</strong> <Link to="/" className="text-gold hover:text-gold-dark">neoahq.com</Link></p>
          </section>

        </div>
      </div>
    </div>
  )
}
