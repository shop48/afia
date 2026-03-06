import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, CreditCard, Truck, Star, Mail } from 'lucide-react'
import { Button, Input, Card, Badge, Modal, Skeleton, StepTracker, ToastContainer, toast } from '../components/ui'
import AppShell from '../components/layout/AppShell'
import { staggerContainer, staggerItem } from '../lib/animations'

export default function DesignShowcase() {
    const [modalOpen, setModalOpen] = useState(false)
    const [activePath, setActivePath] = useState('/admin')

    return (
        <AppShell
            role="SUPER_ADMIN"
            activePath={activePath}
            onNavigate={setActivePath}
            userName="Neoa Admin"
        >
            <ToastContainer />

            {/* Page Header */}
            <div className="mb-10">
                <h1 className="text-2xl lg:text-3xl text-navy font-bold font-[family-name:var(--font-heading)]">
                    Design System
                </h1>
                <p className="text-platinum-dark mt-1 text-sm">NEOA Brand — Component Library Preview</p>
            </div>

            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-12">

                {/* ══════ BUTTONS ══════ */}
                <motion.section variants={staggerItem}>
                    <h2 className="text-lg text-navy font-semibold mb-5 pb-2 border-b border-platinum font-[family-name:var(--font-heading)]">
                        Buttons
                    </h2>
                    <div className="flex flex-wrap gap-3 items-center">
                        <Button variant="primary">Primary</Button>
                        <Button variant="secondary">Secondary</Button>
                        <Button variant="gold" icon={<Star className="w-4 h-4" />}>Gold Action</Button>
                        <Button variant="danger">Danger</Button>
                        <Button variant="ghost">Ghost</Button>
                        <Button variant="primary" loading>Loading...</Button>
                        <Button variant="primary" disabled>Disabled</Button>
                    </div>
                    <div className="flex flex-wrap gap-3 items-center mt-4">
                        <Button size="sm" variant="primary">Small</Button>
                        <Button size="md" variant="primary">Medium</Button>
                        <Button size="lg" variant="primary">Large</Button>
                    </div>
                </motion.section>

                {/* ══════ INPUTS ══════ */}
                <motion.section variants={staggerItem}>
                    <h2 className="text-lg text-navy font-semibold mb-5 pb-2 border-b border-platinum font-[family-name:var(--font-heading)]">
                        Inputs
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                        <Input label="Full Name" placeholder="Enter your name" />
                        <Input label="Email" type="email" placeholder="you@example.com" icon={<Mail className="w-4 h-4" />} />
                        <Input label="Password" type="password" placeholder="••••••••" />
                        <Input label="With Error" error="This field is required" placeholder="Required field..." />
                    </div>
                </motion.section>

                {/* ══════ BADGES ══════ */}
                <motion.section variants={staggerItem}>
                    <h2 className="text-lg text-navy font-semibold mb-5 pb-2 border-b border-platinum font-[family-name:var(--font-heading)]">
                        Badges
                    </h2>
                    <div className="flex flex-wrap gap-2.5">
                        <Badge variant="verified" dot>Verified</Badge>
                        <Badge variant="pending" dot>Pending KYC</Badge>
                        <Badge variant="disputed" dot>Disputed</Badge>
                        <Badge variant="locked">Locked</Badge>
                        <Badge variant="released">Released</Badge>
                        <Badge variant="default">Default</Badge>
                    </div>
                </motion.section>

                {/* ══════ CARDS ══════ */}
                <motion.section variants={staggerItem}>
                    <h2 className="text-lg text-navy font-semibold mb-5 pb-2 border-b border-platinum font-[family-name:var(--font-heading)]">
                        Cards
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        <Card hover>
                            <div className="h-28 bg-gradient-to-br from-navy to-navy-light rounded-lg mb-4 flex items-center justify-center">
                                <ShieldCheck className="w-9 h-9 text-gold" />
                            </div>
                            <h3 className="text-base font-semibold text-navy">Escrow Protected</h3>
                            <p className="text-sm text-platinum-dark mt-1">Funds held securely until delivery is confirmed.</p>
                            <Card.Footer>
                                <div className="flex justify-between items-center">
                                    <Badge variant="verified" dot>Active</Badge>
                                    <Button size="sm" variant="gold">View</Button>
                                </div>
                            </Card.Footer>
                        </Card>

                        <Card hover>
                            <div className="h-28 bg-gradient-to-br from-neoa-emerald to-neoa-emerald-light rounded-lg mb-4 flex items-center justify-center">
                                <CreditCard className="w-9 h-9 text-white" />
                            </div>
                            <h3 className="text-base font-semibold text-navy">Payment Ready</h3>
                            <p className="text-sm text-platinum-dark mt-1">Connected to Paystack and Wise for dual-rail payouts.</p>
                            <Card.Footer>
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-bold text-neoa-emerald">₦45,000</span>
                                    <Button size="sm" variant="primary">Pay</Button>
                                </div>
                            </Card.Footer>
                        </Card>

                        <Card hover>
                            <div className="h-28 bg-gradient-to-br from-gold-dark to-gold-light rounded-lg mb-4 flex items-center justify-center">
                                <Truck className="w-9 h-9 text-white" />
                            </div>
                            <h3 className="text-base font-semibold text-navy">In Transit</h3>
                            <p className="text-sm text-platinum-dark mt-1">Manual waybill uploaded. EDD: 3 days.</p>
                            <Card.Footer>
                                <div className="flex justify-between items-center">
                                    <Badge variant="pending" dot>Shipped</Badge>
                                    <Button size="sm" variant="ghost">Track</Button>
                                </div>
                            </Card.Footer>
                        </Card>
                    </div>
                </motion.section>

                {/* ══════ STEP TRACKER ══════ */}
                <motion.section variants={staggerItem}>
                    <h2 className="text-lg text-navy font-semibold mb-5 pb-2 border-b border-platinum font-[family-name:var(--font-heading)]">
                        Order Progress Tracker
                    </h2>
                    <Card padding="lg">
                        <div className="overflow-x-auto pb-2">
                            <div className="min-w-[600px]">
                                <StepTracker.OrderFlow currentStep={5} />
                            </div>
                        </div>
                    </Card>
                </motion.section>

                {/* ══════ SKELETONS ══════ */}
                <motion.section variants={staggerItem}>
                    <h2 className="text-lg text-navy font-semibold mb-5 pb-2 border-b border-platinum font-[family-name:var(--font-heading)]">
                        Skeleton Loaders
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        <Skeleton.Card />
                        <Skeleton.Card />
                        <Skeleton.Card />
                    </div>
                    <div className="mt-6 max-w-xl">
                        <Skeleton.Row />
                        <Skeleton.Row />
                        <Skeleton.Row />
                    </div>
                </motion.section>

                {/* ══════ MODAL + TOAST ══════ */}
                <motion.section variants={staggerItem} className="pb-8">
                    <h2 className="text-lg text-navy font-semibold mb-5 pb-2 border-b border-platinum font-[family-name:var(--font-heading)]">
                        Modal & Toast
                    </h2>
                    <div className="flex gap-3 flex-wrap">
                        <Button variant="primary" onClick={() => setModalOpen(true)}>Open Modal</Button>
                        <Button variant="gold" onClick={() => toast('Payment approved!', 'success')}>Success Toast</Button>
                        <Button variant="danger" onClick={() => toast('Dispute flagged!', 'error')}>Error Toast</Button>
                        <Button variant="secondary" onClick={() => toast('New order received.', 'info')}>Info Toast</Button>
                    </div>

                    <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Confirm Payout">
                        <p className="text-sm text-platinum-dark mb-6">
                            Are you sure you want to release <strong className="text-navy">KES 38,250</strong> to Nike Vendor Lagos?
                            This action requires MFA confirmation.
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                            <Button variant="gold" onClick={() => { setModalOpen(false); toast('Payout released!', 'success') }}>
                                Confirm & Release
                            </Button>
                        </div>
                    </Modal>
                </motion.section>

            </motion.div>
        </AppShell>
    )
}
