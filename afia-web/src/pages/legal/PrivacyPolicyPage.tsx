import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-platinum-light">
      {/* Header */}
      <div className="bg-navy text-white py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-white/60 hover:text-gold text-sm mb-6 transition-colors">
            <ArrowLeft size={16} /> Back to Home
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-heading)] mb-3">
            Privacy Policy
          </h1>
          <p className="text-white/60 text-sm">Last updated: 4 April 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="prose prose-navy max-w-none space-y-8" style={{ fontFamily: 'var(--font-body)', color: '#374151', lineHeight: 1.8, fontSize: '0.95rem' }}>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">1. Introduction</h2>
            <p>Neoa ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use the Neoa marketplace platform (the "Platform").</p>
            <p>By using the Platform, you consent to the practices described in this Privacy Policy. If you do not agree, please do not use the Platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">2. Information We Collect</h2>
            <h3 className="text-lg font-semibold text-navy mt-4 mb-2">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Information:</strong> Full name, email address, password, and account type (Buyer or Vendor).</li>
              <li><strong>Identity Verification Data:</strong> Government-issued identification documents, photographs, and biometric data (facial recognition) submitted during the verification process.</li>
              <li><strong>Payment Information:</strong> Bank account details for Vendors (for payouts), and payment card or account information processed through our secure payment service providers.</li>
              <li><strong>Profile Information:</strong> Business name, product descriptions, images, and other content you upload to your profile or listings.</li>
              <li><strong>Communication Data:</strong> Messages exchanged between Buyers and Vendors through the Platform's chat system.</li>
            </ul>

            <h3 className="text-lg font-semibold text-navy mt-4 mb-2">2.2 Information Collected Automatically</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Device Information:</strong> Device type, operating system, browser type, and unique device identifiers.</li>
              <li><strong>Usage Data:</strong> Pages visited, features used, time spent on the Platform, and interaction patterns.</li>
              <li><strong>Log Data:</strong> IP address, access times, referring URLs, and error logs.</li>
              <li><strong>Location Data:</strong> Approximate geographic location based on IP address (we do not collect precise GPS location).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">3. How We Use Your Information</h2>
            <p>We use your information for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>To provide and operate the Platform,</strong> including processing Orders, managing escrow payments, and facilitating communication between Buyers and Vendors.</li>
              <li><strong>To verify your identity</strong> and comply with Know Your Customer (KYC) and Anti-Money Laundering (AML) regulations.</li>
              <li><strong>To process payments</strong> and release escrow-held funds to Vendors upon Order confirmation.</li>
              <li><strong>To detect and prevent fraud,</strong> including identity fraud, payment fraud, and other malicious activities.</li>
              <li><strong>To resolve disputes</strong> between Buyers and Vendors.</li>
              <li><strong>To communicate with you</strong> about your account, Orders, security alerts, and Platform updates.</li>
              <li><strong>To improve the Platform,</strong> including analysing usage trends, debugging technical issues, and developing new features.</li>
              <li><strong>To comply with legal obligations,</strong> including tax reporting, regulatory requirements, and law enforcement requests.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">4. How We Share Your Information</h2>
            <p>We do not sell your personal information. We may share your information in the following circumstances:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>With Other Users:</strong> Buyers can see Vendor profile information, product listings, and ratings. Vendors can see Buyer names and delivery information necessary to fulfil Orders.</li>
              <li><strong>With Payment Service Providers:</strong> We share necessary payment data with licensed, regulated payment processors to facilitate transactions, payouts, and escrow services.</li>
              <li><strong>With Identity Verification Providers:</strong> We share identity documents and biometric data with third-party verification services for KYC compliance. These providers are contractually bound to process this data solely for verification purposes.</li>
              <li><strong>With Law Enforcement:</strong> We may disclose information if required by law, regulation, legal process, or governmental request.</li>
              <li><strong>In Connection with a Business Transfer:</strong> If Neoa is involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</li>
              <li><strong>With Your Consent:</strong> We may share information for any other purpose with your explicit consent.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">5. Data Security</h2>
            <p>5.1. We implement industry-standard security measures to protect your personal information, including encryption in transit (TLS/SSL), encryption at rest, secure access controls, and regular security audits.</p>
            <p>5.2. Escrow funds are maintained in secure accounts with licensed and regulated financial institutions.</p>
            <p>5.3. While we take reasonable precautions, no method of transmission or storage is 100% secure. We cannot guarantee absolute security of your information.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">6. Data Retention</h2>
            <p>6.1. We retain your personal information for as long as your account is active or as needed to provide our services.</p>
            <p>6.2. Following account deletion, we may retain certain information for a reasonable period to comply with legal obligations, resolve disputes, and enforce our agreements. This period is typically seven (7) years for financial transaction records.</p>
            <p>6.3. Identity verification data is retained for the duration of your account's active status plus a regulatory retention period as required by applicable KYC/AML regulations.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">7. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the following rights regarding your personal information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> Request a copy of the personal information we hold about you.</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete personal information.</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information, subject to legal and regulatory retention requirements.</li>
              <li><strong>Portability:</strong> Request that your data be provided to you or a third party in a structured, machine-readable format.</li>
              <li><strong>Objection:</strong> Object to processing of your personal information for certain purposes, such as direct marketing.</li>
              <li><strong>Withdrawal of Consent:</strong> Where processing is based on consent, you may withdraw your consent at any time.</li>
            </ul>
            <p>To exercise any of these rights, please contact us at <strong>privacy@neoahq.com</strong>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">8. Cookies and Tracking Technologies</h2>
            <p>8.1. The Platform uses essential cookies to maintain your session and provide core functionality (such as keeping you logged in).</p>
            <p>8.2. We may use analytics tools to understand how users interact with the Platform. These tools may set cookies or use similar tracking technologies.</p>
            <p>8.3. You can control cookies through your browser settings. However, disabling essential cookies may affect the functionality of the Platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">9. International Data Transfers</h2>
            <p>9.1. Neoa operates a cross-border marketplace. Your information may be transferred to, stored, and processed in countries other than your country of residence.</p>
            <p>9.2. When we transfer data internationally, we ensure adequate safeguards are in place to protect your information in compliance with applicable data protection laws.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">10. Children's Privacy</h2>
            <p>The Platform is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If we discover that a child has provided us with personal information, we will delete it promptly.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">11. Changes to This Privacy Policy</h2>
            <p>We may update this Privacy Policy from time to time. Material changes will be communicated via email or through a prominent notice on the Platform at least fourteen (14) days before taking effect. Your continued use of the Platform after the effective date constitutes acceptance of the revised Privacy Policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">12. Nigerian Data Protection Compliance</h2>
            <p>12.1. Neoa complies with the Nigeria Data Protection Act (NDPA) 2023 and the Nigeria Data Protection Regulation (NDPR).</p>
            <p>12.2. As required by the NDPA, we process personal data lawfully, fairly, and transparently. We collect data only for specific, legitimate purposes and retain it only as long as necessary.</p>
            <p>12.3. If you believe your data protection rights have been violated, you have the right to lodge a complaint with the Nigeria Data Protection Commission (NDPC).</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-navy font-[family-name:var(--font-heading)] mb-3">13. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy or wish to exercise your data rights, please contact us at:</p>
            <p><strong>Email:</strong> privacy@neoahq.com</p>
            <p><strong>Data Protection Officer:</strong> dpo@neoahq.com</p>
            <p><strong>Website:</strong> <Link to="/" className="text-gold hover:text-gold-dark">neoahq.com</Link></p>
          </section>

        </div>
      </div>
    </div>
  )
}
