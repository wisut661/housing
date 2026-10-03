import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { ArrowDownToLine, ArrowUpRight, Bell, Building2, Check, ChevronDown, ClipboardList, CreditCard, Droplets, FileText, Home, LayoutDashboard, LockKeyhole, LogOut, Menu, MessageCircle, Pencil, Plus, Printer, Search, ShieldCheck, ToolCase, Trash2, Wallet, Wrench, X } from 'lucide-react'
import './App.css'

type WaterBillingMode = 'fixed' | 'metered'
type Project = { id: number; project_code: string; project_name: string; address: string; phone: string; status: string; created_at: string; water_billing_mode?: WaterBillingMode; water_fixed_amount?: number; water_unit_rate?: number }
type House = { id: number; project_id: number; house_code: string; house_no: string; plot_no: string; house_type: string; land_area: number; house_area: number; status: string }
type Member = { id: number; member_code: string; title: string; first_name: string; last_name: string; phone: string; line_id: string; email: string; status: string; house_id?: number }
type Rate = { id: number; project_id: number; amount: number; unit: string; effective_from: string; status: string }
type Charge = { id: number; charge_no: string; project_id: number; rate_id: number; house_id: number; member_id: number; period: string; amount: number; water_amount?: number; water_previous_reading?: number; water_current_reading?: number; water_units?: number; penalty_amount?: number; issued_at?: string; due_date: string; status: string }
type Payment = { id: number; payment_no: string; payment_date: string; member_id: number; house_id: number; charge_id: number; amount: number; payment_method: string; bank_account: string; reference_no: string; status: string }
type PaymentAllocation = { id: number; payment_id: number; charge_id: number; amount: number }
type InvoiceBreakdown = { current: number; arrears: number; penalty: number; paid: number; totalDue: number }
type Item = { id: number; title: string; detail: string; status: string; date: string; amount?: number }
type Store = { projects: Project[]; houses: House[]; members: Member[]; rates: Rate[]; charges: Charge[]; payments: Payment[]; paymentAllocations: PaymentAllocation[]; repairs: Item[]; assets: Item[]; finance: Item[]; announcements: Item[] }
type Screen = 'dashboard' | 'projects' | 'houses' | 'members' | 'rates' | 'charges' | 'payments' | 'water' | 'repairs' | 'assets' | 'finance' | 'announcements' | 'reports'
type ModuleScreen = Exclude<Screen, 'dashboard' | 'water' | 'reports'>
type PrintTarget = { kind: 'charge'; record: Charge } | { kind: 'payment'; record: Payment }
type StoreInspectionData = {
  browser: { href: string; origin: string; protocol: string; hostname: string; port: string }
  charges: Pick<Charge, 'id' | 'charge_no' | 'house_id' | 'project_id' | 'amount' | 'status'>[]
  payments: Pick<Payment, 'id' | 'payment_no' | 'charge_id' | 'amount' | 'status'>[]
  paymentAllocations: Pick<PaymentAllocation, 'payment_id' | 'charge_id' | 'amount'>[]
  error?: string
}
type InvoiceCleanupPreview = {
  rawValue: string
  counts: { charges: number; payments: number; paymentAllocations: number }
  preservedCounts: { projects: number; houses: number; members: number }
  preservedJson: string
  error?: string
  result?: { cleared: boolean; preserved: boolean }
}

const invoiceCleanupKeys = ['charges', 'payments', 'paymentAllocations']

function preservedStoreJson(value: Record<string, unknown>) {
  return JSON.stringify(Object.fromEntries(Object.entries(value).filter(([key]) => !invoiceCleanupKeys.includes(key))))
}

function readInvoiceCleanupPreview(): InvoiceCleanupPreview {
  const rawValue = window.localStorage.getItem('baanjai-store')
  if (rawValue === null) return { rawValue: '', counts: { charges: 0, payments: 0, paymentAllocations: 0 }, preservedCounts: { projects: 0, houses: 0, members: 0 }, preservedJson: '', error: 'ไม่พบข้อมูล localStorage key baanjai-store' }
  try {
    const parsed = JSON.parse(rawValue) as Record<string, unknown>
    const count = (key: string) => Array.isArray(parsed[key]) ? (parsed[key] as unknown[]).length : 0
    return {
      rawValue,
      counts: { charges: count('charges'), payments: count('payments'), paymentAllocations: count('paymentAllocations') },
      preservedCounts: { projects: count('projects'), houses: count('houses'), members: count('members') },
      preservedJson: preservedStoreJson(parsed),
    }
  } catch {
    return { rawValue, counts: { charges: 0, payments: 0, paymentAllocations: 0 }, preservedCounts: { projects: 0, houses: 0, members: 0 }, preservedJson: '', error: 'ข้อมูล baanjai-store ไม่ใช่ JSON ที่ถูกต้อง' }
  }
}

const initial: Store = {
  projects: [{ id: 1, project_code: 'GV-001', project_name: 'หมู่บ้านเดอะ การ์เด้น วิลล์', address: '88/8 ถ.ร่มเกล้า เขตลาดกระบัง กรุงเทพฯ 10520', phone: '02-345-6789', status: 'ACTIVE', created_at: '2026-01-01', water_billing_mode: 'fixed', water_fixed_amount: 0, water_unit_rate: 0 }],
  houses: [{ id: 101, project_id: 1, house_code: 'GV-A-018', house_no: '88/18', plot_no: 'A-018', house_type: 'บ้านเดี่ยว', land_area: 52, house_area: 168, status: 'OCCUPIED' }, { id: 102, project_id: 1, house_code: 'GV-B-042', house_no: '88/42', plot_no: 'B-042', house_type: 'บ้านเดี่ยว', land_area: 60, house_area: 190, status: 'OCCUPIED' }, { id: 103, project_id: 1, house_code: 'GV-C-011', house_no: '88/51', plot_no: 'C-011', house_type: 'ทาวน์โฮม', land_area: 24, house_area: 128, status: 'OCCUPIED' }],
  members: [{ id: 25, member_code: 'MB-0025', title: 'คุณ', first_name: 'กมลวรรณ', last_name: 'สุวรรณ', phone: '081-234-5678', line_id: 'kamonwan18', email: 'kamonwan@example.com', status: 'ACTIVE', house_id: 101 }, { id: 26, member_code: 'MB-0026', title: 'คุณ', first_name: 'ธนกร', last_name: 'ใจดี', phone: '089-123-4567', line_id: 'thanakorn42', email: 'thanakorn@example.com', status: 'ACTIVE', house_id: 102 }, { id: 27, member_code: 'MB-0027', title: 'คุณ', first_name: 'วราภรณ์', last_name: 'มั่นคง', phone: '086-765-4321', line_id: 'wara_c11', email: 'waraporn@example.com', status: 'ACTIVE', house_id: 103 }],
  rates: [{ id: 1, project_id: 1, amount: 1500, unit: 'บาท / ตร.ว. / เดือน', effective_from: '2026-01-01', status: 'ACTIVE' }],
  charges: [{ id: 1, charge_no: 'INV69090001', project_id: 1, rate_id: 1, house_id: 101, member_id: 25, period: '09/2026', amount: 1500, due_date: '2026-09-30', status: 'UNPAID' }, { id: 2, charge_no: 'INV69090002', project_id: 1, rate_id: 1, house_id: 102, member_id: 26, period: '09/2026', amount: 1500, due_date: '2026-09-30', status: 'PAID' }, { id: 3, charge_no: 'INV69090003', project_id: 1, rate_id: 1, house_id: 103, member_id: 27, period: '09/2026', amount: 1500, due_date: '2026-09-30', status: 'OVERDUE' }, { id: 4, charge_no: 'INV69080001', project_id: 1, rate_id: 1, house_id: 101, member_id: 25, period: '08/2026', amount: 1500, due_date: '2026-08-31', status: 'OVERDUE' }],
  payments: [{ id: 1, payment_no: 'RC69090001', payment_date: '2026-09-15', member_id: 26, house_id: 102, charge_id: 2, amount: 1500, payment_method: 'TRANSFER', bank_account: 'KBANK', reference_no: 'xxx123', status: 'CONFIRMED' }],
  paymentAllocations: [],
  repairs: [{ id: 1, title: 'ไฟถนนดับ', detail: 'ถนนเมน โซน B · ผู้แจ้ง แปลง B-016', status: 'กำลังดำเนินการ', date: 'วันนี้ 09:24' }, { id: 2, title: 'ท่อระบายน้ำอุดตัน', detail: 'ซอย A3 · ผู้แจ้ง แปลง A-031', status: 'รับเรื่องแล้ว', date: 'เมื่อวาน' }],
  assets: [{ id: 1, title: 'ปั๊มน้ำอาคารส่วนกลาง', detail: 'อาคารนิติบุคคล · ตรวจล่าสุด 10 ก.ย. 2569', status: 'ปกติ', date: 'ครบกำหนด 10 ธ.ค. 2569' }],
  finance: [{ id: 1, title: 'ค่าดูแลสวน', detail: 'รายจ่าย · บริษัท กรีนแคร์', status: 'รายจ่าย', date: '25 ก.ย. 2569', amount: 32000 }, { id: 2, title: 'ค่าไฟส่วนกลาง', detail: 'รายจ่าย · การไฟฟ้าส่วนภูมิภาค', status: 'รายจ่าย', date: '22 ก.ย. 2569', amount: 18450 }],
  announcements: [{ id: 1, title: 'แจ้งปิดสระว่ายน้ำเพื่อบำรุงรักษา', detail: 'LINE Official · 126 ครัวเรือน', status: 'ส่งแล้ว', date: '27 ก.ย. 2569' }],
}

const labels: Record<Screen, string> = { dashboard: 'ภาพรวม Dashboard', projects: 'โครงการ', houses: 'บ้าน / แปลง', members: 'ลูกบ้าน', rates: 'อัตราค่าส่วนกลาง', charges: 'ใบแจ้งหนี้', payments: 'รับชำระ', water: 'รายการค่าน้ำ', repairs: 'แจ้งซ่อม / งานบริการ', assets: 'ทรัพย์สินส่วนกลาง', finance: 'รายรับ / รายจ่าย', announcements: 'ประกาศ / LINE', reports: 'รายงานโครงการ' }
type ReportView = 'common-fees' | 'receivables'
type NavItem = { key: string; label: string; icon: typeof Home; id?: Screen; phase?: string; action?: 'create-charge'; disabled?: boolean }
const reportNavItems: { key: string; label: string; view: ReportView }[] = [
  { key: 'report-common-fees', label: 'ค่าส่วนกลางรายเดือน', view: 'common-fees' },
  { key: 'report-receivables', label: 'ลูกหนี้ค้างชำระ', view: 'receivables' },
]
const groups: { label: string; phase: string; items: NavItem[] }[] = [
  { label: 'ข้อมูลหลัก', phase: 'PHASE 1', items: [{ key: 'projects', id: 'projects', label: 'โครงการ', icon: Building2 }, { key: 'houses', id: 'houses', label: 'บ้าน / แปลง', icon: Home }, { key: 'members', id: 'members', label: 'ลูกบ้าน', icon: ClipboardList }, { key: 'rates', id: 'rates', label: 'อัตราค่าส่วนกลาง', icon: Wallet }] },
  { label: 'การเงิน', phase: 'PHASE 1', items: [{ key: 'create-charge', id: 'charges', label: 'สร้างใบเรียกเก็บ', icon: Plus, action: 'create-charge' }, { key: 'charges', id: 'charges', label: 'ใบแจ้งหนี้', icon: FileText }, { key: 'payments', id: 'payments', label: 'รับชำระ', icon: CreditCard }, { key: 'water', id: 'water', label: 'รายการค่าน้ำ', icon: Droplets }, { key: 'receipts', id: 'payments', label: 'ใบเสร็จ', icon: Printer }] },
  { label: 'ขยายระบบ', phase: 'PHASE 2', items: [{ key: 'assets', id: 'assets', label: 'ทรัพย์สินส่วนกลาง', icon: ToolCase }, { key: 'repairs', id: 'repairs', label: 'แจ้งซ่อม / งานบริการ', icon: Wrench }, { key: 'finance', id: 'finance', label: 'รายรับ / รายจ่าย', icon: ArrowDownToLine }] },
  { label: 'การสื่อสาร', phase: 'PHASE 3', items: [{ key: 'announcements', id: 'announcements', label: 'ประกาศ / LINE', icon: MessageCircle, disabled: true }] },
  { label: 'รายงาน / ตั้งค่า', phase: 'PHASE 4', items: [{ key: 'reports', id: 'reports', label: 'รายงานโครงการ', icon: ClipboardList }, { key: 'settings', label: 'ผู้ใช้งาน / สิทธิ์', icon: ShieldCheck, disabled: true }] },
]
const actionText: Partial<Record<Screen, string>> = { projects: 'เพิ่มโครงการ', houses: 'เพิ่มบ้าน / แปลง', members: 'เพิ่มลูกบ้าน', rates: 'เพิ่มอัตรา', charges: 'สร้างใบเรียกเก็บ', payments: 'บันทึกรับเงิน', repairs: 'เพิ่มงานบริการ', assets: 'เพิ่มทรัพย์สิน', finance: 'เพิ่มรายการบัญชี', announcements: 'สร้างประกาศ' }
const num = (value: number) => new Intl.NumberFormat('th-TH').format(value)
const person = (member?: Member) => member ? `${member.title}${member.first_name} ${member.last_name}` : '-'
const getStatus = (status: string) => ({ ACTIVE: 'ใช้งาน', OCCUPIED: 'มีผู้อยู่อาศัย', UNPAID: 'รอชำระ', PARTIAL: 'ชำระบางส่วน', PAID: 'ชำระแล้ว', OVERDUE: 'เกินกำหนด', CONFIRMED: 'ยืนยันแล้ว', PENDING: 'รอตรวจสอบ' }[status] ?? status)

function periodKey(period: string) {
  const [month, year] = period.split('/').map(Number)
  return year * 12 + month
}

function commonFeeForHouse(rate: Rate, house: House) {
  return rate.amount * house.land_area
}

function amountAllocated(store: Store, chargeId: number) {
  const allocationPaymentIds = new Set(store.paymentAllocations.map((allocation) => allocation.payment_id))
  const allocations = store.paymentAllocations.filter((allocation) => allocation.charge_id === chargeId).reduce((sum, allocation) => sum + allocation.amount, 0)
  const legacyPayments = store.payments.filter((payment) => payment.charge_id === chargeId && payment.status === 'CONFIRMED' && !allocationPaymentIds.has(payment.id)).reduce((sum, payment) => sum + payment.amount, 0)
  return allocations + legacyPayments
}

function chargeBalance(store: Store, charge: Charge) {
  return Math.max(0, charge.amount + (charge.water_amount ?? 0) + (charge.penalty_amount ?? 0) - amountAllocated(store, charge.id))
}

function invoiceBreakdown(store: Store, charge: Charge): InvoiceBreakdown {
  const [chargeMonth, chargeYear] = charge.period.split('/')
  const issueDate = charge.issued_at ?? `${chargeYear}-${chargeMonth}-01`
  const previousCharges = store.charges.filter((item) => item.project_id === charge.project_id && item.house_id === charge.house_id && item.id !== charge.id && periodKey(item.period) < periodKey(charge.period) && item.due_date < issueDate)
  const arrears = previousCharges.reduce((sum, item) => sum + chargeBalance(store, item), 0)
  const penalty = charge.penalty_amount ?? (arrears > 0 ? 100 : 0)
  const paid = amountAllocated(store, charge.id)
  const current = Math.max(0, charge.amount + (charge.water_amount ?? 0) + penalty - paid)
  return { current, arrears, penalty, paid, totalDue: current + arrears }
}

function allocatePayment(store: Store, paymentId: number, amount: number, currentCharge: Charge) {
  const previousCharges = store.charges.filter((item) => item.project_id === currentCharge.project_id && item.house_id === currentCharge.house_id && item.id !== currentCharge.id && periodKey(item.period) < periodKey(currentCharge.period)).sort((left, right) => periodKey(left.period) - periodKey(right.period))
  let remaining = amount
  const affected = [currentCharge, ...previousCharges]
  for (const charge of affected) {
    if (remaining <= 0) break
    const allocationAmount = Math.min(remaining, chargeBalance(store, charge))
    if (allocationAmount <= 0) continue
    store.paymentAllocations.push({ id: Date.now() + store.paymentAllocations.length, payment_id: paymentId, charge_id: charge.id, amount: allocationAmount })
    remaining -= allocationAmount
  }
  for (const charge of affected) {
    const balance = chargeBalance(store, charge)
    charge.status = balance <= 0 ? 'PAID' : balance < charge.amount + (charge.penalty_amount ?? 0) ? 'PARTIAL' : charge.status
  }
  return remaining
}

function generateMonthlyInvoices(store: Store, date: Date, projectId: number, dueDateOverride?: string, houseIds?: number[], waterReadings: Record<number, { previous: number; current: number }> = {}) {
  const next = structuredClone(store) as Store
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const period = `${String(month).padStart(2, '0')}/${year}`
  const dueDate = dueDateOverride || `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`
  const issuedAt = `${year}-${String(month).padStart(2, '0')}-01`
  const buddhistYear = String(year + 543).slice(-2)
  const project = next.projects.find((item) => item.id === projectId)
  let created = 0
  let skipped = 0

  for (const house of next.houses) {
    if (house.project_id !== projectId || (houseIds && !houseIds.includes(house.id))) continue
    const member = next.members.find((item) => item.house_id === house.id && item.status === 'ACTIVE')
    const rate = next.rates.filter((item) => item.project_id === house.project_id && item.status === 'ACTIVE' && item.effective_from <= `${year}-${String(month).padStart(2, '0')}-01`).sort((left, right) => right.effective_from.localeCompare(left.effective_from))[0]
    if (!member || !rate || next.charges.some((item) => item.project_id === house.project_id && item.house_id === house.id && item.period === period)) {
      skipped += 1
      continue
    }

    const sequence = next.charges.filter((item) => item.period === period).reduce((highest, item) => Math.max(highest, Number(item.charge_no.slice(-4)) || 0), 0) + 1
    const waterReading = waterReadings[house.id]
    const waterUnits = waterReading ? Math.max(0, waterReading.current - waterReading.previous) : 0
    const waterAmount = project?.water_billing_mode === 'metered' ? waterUnits * (project.water_unit_rate ?? 0) : project?.water_fixed_amount ?? 0
    const charge: Charge = { id: Math.max(0, ...next.charges.map((item) => item.id)) + 1, charge_no: `INV${buddhistYear}${String(month).padStart(2, '0')}${String(sequence).padStart(4, '0')}`, project_id: house.project_id, rate_id: rate.id, house_id: house.id, member_id: member.id, period, amount: commonFeeForHouse(rate, house), water_amount: waterAmount, ...(waterReading ? { water_previous_reading: waterReading.previous, water_current_reading: waterReading.current, water_units: waterUnits } : {}), issued_at: issuedAt, due_date: dueDate, status: 'UNPAID' }
    charge.penalty_amount = invoiceBreakdown(next, charge).penalty
    next.charges.push(charge)
    created += 1
  }

  return { store: next, created, skipped, period }
}

function readStore(): Store {
  try {
    const value = localStorage.getItem('baanjai-store')
    if (!value) return initial
    const stored = JSON.parse(value) as Partial<Store>
    const rates = Array.isArray(stored.rates) ? stored.rates.map((rate) => rate.unit === 'บาท / แปลง / เดือน' ? { ...rate, unit: 'บาท / ตร.ว. / เดือน' } : rate) : initial.rates
    return { ...initial, ...stored, rates }
  } catch { return initial }
}

function readStoreInspection(): StoreInspectionData {
  const browser = {
    href: window.location.href,
    origin: window.location.origin,
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    port: window.location.port,
  }
  try {
    const value = window.localStorage.getItem('baanjai-store')
    if (!value) return { browser, charges: [], payments: [], paymentAllocations: [], error: 'ไม่พบข้อมูลใน localStorage key baanjai-store' }
    const parsed = JSON.parse(value) as Partial<Store>
    return {
      browser,
      charges: Array.isArray(parsed.charges) ? parsed.charges.map(({ id, charge_no, house_id, project_id, amount, status }) => ({ id, charge_no, house_id, project_id, amount, status })) : [],
      payments: Array.isArray(parsed.payments) ? parsed.payments.map(({ id, payment_no, charge_id, amount, status }) => ({ id, payment_no, charge_id, amount, status })) : [],
      paymentAllocations: Array.isArray(parsed.paymentAllocations) ? parsed.paymentAllocations.map(({ payment_id, charge_id, amount }) => ({ payment_id, charge_id, amount })) : [],
    }
  } catch {
    return { browser, charges: [], payments: [], paymentAllocations: [], error: 'อ่าน baanjai-store ไม่สำเร็จ หรือข้อมูลไม่ใช่ JSON ที่ถูกต้อง' }
  }
}

function App({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [store, setStore] = useState<Store>(readStore)
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState(false)
  const [bulkInvoiceDialog, setBulkInvoiceDialog] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [activeNavKey, setActiveNavKey] = useState('dashboard')
  const [reportsExpanded, setReportsExpanded] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [role, setRole] = useState('ผู้บริหาร')
  const [toast, setToast] = useState('')
  const [inspectionData, setInspectionData] = useState<StoreInspectionData | null>(null)
  const [invoiceCleanup, setInvoiceCleanup] = useState<InvoiceCleanupPreview | null>(null)
  useEffect(() => localStorage.setItem('baanjai-store', JSON.stringify(store)), [store])
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 3000); return () => clearTimeout(timer) }, [toast])
  const nav = (id: Screen, key: string = id) => { setScreen(id); setActiveNavKey(key); setQuery(''); setMobile(false); if (id !== 'reports') setReportsExpanded(false) }
  const removeRecord = (targetScreen: ModuleScreen | 'water' | 'reports', id: number) => {
    if (targetScreen === 'water' || targetScreen === 'reports') return
    setStore((previous) => {
      if (targetScreen === 'charges') {
        const charge = previous.charges.find((item) => item.id === id)
        const hasPayments = previous.payments.some((payment) => payment.charge_id === id)
        const hasAllocations = previous.paymentAllocations.some((allocation) => allocation.charge_id === id)
        if (!charge || charge.status === 'PAID' || charge.status === 'PARTIAL' || hasPayments || hasAllocations) return previous
      }
      const next = structuredClone(previous) as Store
      if (targetScreen === 'payments') {
        const payment = next.payments.find((item) => item.id === id)
        if (!payment) return previous
        const affectedChargeIds = new Set(next.paymentAllocations.filter((allocation) => allocation.payment_id === id).map((allocation) => allocation.charge_id))
        affectedChargeIds.add(payment.charge_id)
        next.payments = next.payments.filter((item) => item.id !== id)
        next.paymentAllocations = next.paymentAllocations.filter((allocation) => allocation.payment_id !== id)
        const today = new Date().toISOString().slice(0, 10)
        for (const chargeId of affectedChargeIds) {
          const charge = next.charges.find((item) => item.id === chargeId)
          if (!charge) continue
          const total = charge.amount + (charge.penalty_amount ?? 0)
          const paid = amountAllocated(next, charge.id)
          const balance = Math.max(0, total - paid)
          charge.status = balance <= 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : charge.due_date < today ? 'OVERDUE' : 'UNPAID'
        }
        return next
      }
      const collection = next[targetScreen] as Array<{ id: number }>
      Object.assign(next, { [targetScreen]: collection.filter((record) => record.id !== id) })
      return next
    })
  }
  const confirmInvoiceCleanup = () => {
    if (!invoiceCleanup || invoiceCleanup.error || invoiceCleanup.result) return
    const latest = readInvoiceCleanupPreview()
    if (latest.error) {
      setInvoiceCleanup(latest)
      return
    }
    if (latest.rawValue !== invoiceCleanup.rawValue) {
      setInvoiceCleanup({ ...latest, error: 'ข้อมูลเปลี่ยนหลังจากเปิดหน้าตรวจสอบ กรุณาตรวจจำนวนล่าสุดก่อนยืนยันอีกครั้ง' })
      return
    }
    const message = `ยืนยันการล้างข้อมูลทดสอบใบแจ้งหนี้หรือไม่?\n\nระบบจะลบเฉพาะ:\n- ใบแจ้งหนี้ ${latest.counts.charges} รายการ\n- รายการรับชำระ ${latest.counts.payments} รายการ\n- รายการจัดสรรการชำระ ${latest.counts.paymentAllocations} รายการ\n\nและจะไม่ลบโครงการ บ้าน สมาชิก ข้อมูลค่าน้ำ หรือข้อมูลอื่นของระบบ`
    if (!window.confirm(message)) return
    try {
      const current = JSON.parse(latest.rawValue) as Record<string, unknown>
      const next = { ...current, charges: [], payments: [], paymentAllocations: [] }
      window.localStorage.setItem('baanjai-store', JSON.stringify(next))
      const verified = readInvoiceCleanupPreview()
      if (verified.error) {
        setInvoiceCleanup(verified)
        return
      }
      const cleared = verified.counts.charges === 0 && verified.counts.payments === 0 && verified.counts.paymentAllocations === 0
      const preserved = latest.preservedJson === verified.preservedJson
      if (cleared && preserved) setStore(JSON.parse(verified.rawValue) as Store)
      setInvoiceCleanup({ ...verified, result: { cleared, preserved }, error: cleared && preserved ? undefined : 'การตรวจสอบหลังล้างข้อมูลไม่ผ่าน กรุณาตรวจสอบ localStorage' })
    } catch {
      setInvoiceCleanup({ ...invoiceCleanup, error: 'ล้างหรือยืนยันข้อมูลไม่สำเร็จ กรุณาตรวจสอบ localStorage' })
    }
  }
  const project = store.projects[0]
  const totalPaid = store.payments.filter((payment) => payment.status === 'CONFIRMED').reduce((sum, payment) => sum + payment.amount, 0)
  const overdue = store.charges.filter((charge) => charge.status === 'OVERDUE')

  return <div className="app-shell">
    <aside className={`sidebar ${mobile ? 'sidebar-open' : ''}`}><button className="brand" onClick={() => nav('dashboard')}><span className="brand-mark"><Home size={20} /></span><span>บ้านใจ<small>COMMUNITY OFFICE</small></span></button><button className={`nav-link dashboard-link ${activeNavKey === 'dashboard' ? 'active' : ''}`} onClick={() => nav('dashboard')}><LayoutDashboard size={17} />Dashboard</button><nav>{groups.map((group) => <section className="nav-group" key={group.label}><div className="nav-group-heading"><p className="nav-label">{group.label}</p><span className="nav-phase">{group.phase}</span></div>{group.items.map((item) => { const Icon = item.icon; const handleClick = () => { if (!item.id || item.disabled) return; if (item.id === 'reports') { setScreen('reports'); setActiveNavKey((current) => current.startsWith('report-') ? current : 'report-common-fees'); setReportsExpanded((expanded) => !expanded); setQuery(''); setMobile(false); return } nav(item.id, item.key); if (item.action === 'create-charge') { setEditId(null); setBulkInvoiceDialog(true) } }; return <div className="nav-item-group" key={item.key}><button disabled={item.disabled} title={item.disabled ? `กำหนดไว้ใน ${group.phase}` : undefined} aria-expanded={item.id === 'reports' ? reportsExpanded : undefined} className={`nav-link ${(item.id === 'reports' && screen === 'reports') || activeNavKey === item.key ? 'active' : ''} ${item.disabled ? 'nav-link-disabled' : ''}`} onClick={handleClick}><Icon size={17} /><span>{item.label}</span>{item.id === 'reports' && <ChevronDown className={`nav-expand-icon ${reportsExpanded ? 'expanded' : ''}`} size={14} />}{item.disabled && <span className="phase-badge">เร็ว ๆ นี้</span>}</button>{item.id === 'reports' && reportsExpanded && <div className="nav-submenu">{reportNavItems.map((report) => <button key={report.key} type="button" className={`nav-sub-link ${activeNavKey === report.key ? 'active' : ''}`} aria-current={activeNavKey === report.key ? 'page' : undefined} onClick={() => { setScreen('reports'); setActiveNavKey(report.key); setReportsExpanded(true); setQuery(''); setMobile(false) }}>{report.label}</button>)}</div>}</div> })}</section>)}</nav><div className="sidebar-bottom"><div className="help-card"><ShieldCheck size={17} /><span>ข้อมูลโครงการ<small>ระบบจัดการชุมชน</small></span></div><div className="profile-row">{user.photoURL ? <img className="avatar profile-avatar" src={user.photoURL} alt="" /> : <span className="avatar">{user.displayName?.[0] ?? user.email?.[0] ?? '?'}</span>}<span className="profile-info">{user.displayName || 'ผู้ใช้ Google'}<small>{user.email}</small></span><button type="button" className="profile-signout" onClick={onSignOut} aria-label="ออกจากระบบ" title="ออกจากระบบ"><LogOut size={16} /></button></div></div></aside>
    {mobile && <button className="mobile-scrim" onClick={() => setMobile(false)} aria-label="ปิดเมนู" />}
    <button type="button" className="primary-button" style={{ position: 'fixed', right: 20, bottom: 68, zIndex: 7, background: '#b14f3f' }} onClick={() => setInvoiceCleanup(readInvoiceCleanupPreview())}><Trash2 size={16} />ล้างข้อมูลทดสอบใบแจ้งหนี้</button>
    <button type="button" className="secondary-button" style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 7 }} onClick={() => setInspectionData(readStoreInspection())}><ClipboardList size={16} />ตรวจสอบข้อมูลระบบ</button>
    <main className="main-area"><header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMobile(true)} aria-label="เปิดเมนู"><Menu size={20} /></button><div className="breadcrumb"><span>โครงการ</span><span>/</span><strong>{labels[screen]}</strong></div><div className="topbar-actions"><label className="role-picker"><ShieldCheck size={15} /><select value={role} onChange={(event) => setRole(event.target.value)}><option>ผู้บริหาร</option><option>เจ้าหน้าที่</option><option>ลูกบ้าน</option></select><ChevronDown size={13} /></label><button className="icon-button" onClick={() => setToast('ไม่มีการแจ้งเตือนใหม่')} aria-label="แจ้งเตือน"><Bell size={18} /></button></div></header>
      <div className="page-content"><div className="page-heading"><div><p className="eyebrow">{project?.project_name ?? 'โครงการ'} <span>·</span> รอบบัญชี ก.ย. 2569</p><h1>{labels[screen]}</h1><p className="page-description">{screen === 'dashboard' ? 'สรุปข้อมูลหลัก ธุรกรรม และงานของโครงการ' : `จัดการ${labels[screen]}ของโครงการ`}</p></div>{screen !== 'dashboard' && screen !== 'water' && screen !== 'reports' && <button className="primary-button" onClick={() => { setEditId(null); if (screen === 'charges') setBulkInvoiceDialog(true); else setDialog(true) }}><Plus size={17} />{actionText[screen]}</button>}</div>
        {screen === 'dashboard' && <SetupFlow store={store} navigate={nav} />}
        {screen === 'dashboard' ? <><section className="summary-grid"><article className="summary-card"><span className="summary-icon green-icon"><Wallet size={18} /></span><p>รับชำระแล้ว</p><strong>฿ {num(totalPaid)}</strong><small>จาก {store.payments.length} รายการรับเงิน</small></article><article className="summary-card"><span className="summary-icon blue-icon"><Home size={18} /></span><p>บ้าน / แปลง</p><strong>{store.houses.length} <em>แปลง</em></strong><small>{store.members.length} ลูกบ้านในระบบ</small></article><article className="summary-card"><span className="summary-icon amber-icon"><FileText size={18} /></span><p>ใบแจ้งหนี้</p><strong>{store.charges.length} <em>รายการ</em></strong><small>{store.charges.filter((charge) => charge.status === 'PAID').length} รายการชำระแล้ว</small></article><article className="summary-card"><span className="summary-icon red-icon"><Bell size={18} /></span><p>เกินกำหนด</p><strong>{overdue.length} <em>รายการ</em></strong><small>ยอดค้าง ฿ {num(overdue.reduce((sum, item) => sum + item.amount, 0))}</small></article></section><section className="dashboard-columns"><article className="content-panel"><div className="panel-heading"><div><h2>ค่าส่วนกลาง</h2><p>อัตราปัจจุบันและสถานะเรียกเก็บ</p></div><button className="text-button" onClick={() => nav('rates')}>จัดการอัตรา <ArrowUpRight size={14} /></button></div><div className="rate-summary"><div><small>อัตราต่อแปลง / เดือน</small><strong>฿ {num(store.rates[0]?.amount ?? 0)}</strong><span>{store.rates[0]?.unit}</span></div><div className="rate-arrow"><ArrowDownToLine size={20} /></div><div><small>ใบแจ้งหนี้ในระบบ</small><strong>{store.charges.length} <em>รายการ</em></strong><span>เรียกเก็บแล้ว {store.charges.filter((charge) => charge.status === 'PAID').length} รายการ</span></div></div><div className="flow-links"><button onClick={() => nav('charges')}><FileText size={16} />การเรียกเก็บ <ArrowUpRight size={14} /></button><button onClick={() => nav('payments')}><CreditCard size={16} />การรับชำระ <ArrowUpRight size={14} /></button></div></article><article className="content-panel"><div className="panel-heading"><div><h2>งานที่ต้องติดตาม</h2><p>สถานะธุรกรรมและงานบริการ</p></div><span className="task-count">{overdue.length + store.repairs.length}</span></div><button className="task-row" onClick={() => nav('charges')}><span className="task-icon task-red"><FileText size={16} /></span><span><strong>บิลเกินกำหนด</strong><small>{overdue.length} รายการ · ฿ {num(overdue.reduce((sum, item) => sum + item.amount, 0))}</small></span><span>›</span></button><button className="task-row" onClick={() => nav('repairs')}><span className="task-icon task-yellow"><Wrench size={16} /></span><span><strong>งานแจ้งซ่อม</strong><small>{store.repairs.length} รายการในระบบ</small></span><span>›</span></button><button className="task-row" onClick={() => nav('announcements')}><span className="task-icon task-blue"><MessageCircle size={16} /></span><span><strong>ประกาศ / LINE</strong><small>{store.announcements.length} ประกาศ</small></span><span>›</span></button></article></section><div className="role-note">มุมมอง{role} <span>·</span> ข้อมูลตัวอย่าง</div></> : <Module screen={screen} store={store} query={query} setQuery={setQuery} onEdit={(id) => { setEditId(id); setDialog(true) }} onDelete={(id) => removeRecord(screen, id)} />}
        <footer className="page-footer"><span>บ้านใจ · ระบบบริหารโครงการบ้านจัดสรร</span><span>ข้อมูลจัดเก็บในอุปกรณ์นี้</span></footer></div>
    </main>
    {inspectionData && <StoreInspectionDialog data={inspectionData} close={() => setInspectionData(null)} />}
    {invoiceCleanup && <InvoiceCleanupDialog preview={invoiceCleanup} close={() => setInvoiceCleanup(null)} confirm={confirmInvoiceCleanup} />}
    {bulkInvoiceDialog && <BulkInvoiceDialog store={store} close={() => setBulkInvoiceDialog(false)} save={(next, created, skipped, period) => { setStore(next); setBulkInvoiceDialog(false); setScreen('charges'); setActiveNavKey('charges'); setToast(`สร้างใบแจ้งหนี้ ${created} รายการ รอบ ${period}${skipped ? ` · ข้าม ${skipped} รายการ` : ''}`) }} />}{dialog && screen !== 'dashboard' && screen !== 'water' && screen !== 'reports' && <EntryDialog screen={screen} store={store} editId={editId} close={() => { setDialog(false); setEditId(null) }} save={(next) => { setStore(next); setDialog(false); setEditId(null); setToast(editId === null ? 'บันทึกรายการแล้ว' : 'บันทึกการแก้ไขแล้ว') }} />}{toast && <div className="toast" role="status"><Check size={16} />{toast}<button onClick={() => setToast('')} aria-label="ปิด"><X size={15} /></button></div>}
  </div>
}

function StoreInspectionDialog({ data, close }: { data: StoreInspectionData; close: () => void }) {
  const paymentIdsWithAllocations = new Set(data.paymentAllocations.map((allocation) => allocation.payment_id))
  const summaries = data.charges.map((charge) => {
    const chargeAllocations = data.paymentAllocations.filter((allocation) => allocation.charge_id === charge.id)
    const allocationAmount = chargeAllocations.reduce((sum, allocation) => sum + Number(allocation.amount || 0), 0)
    const relatedPayments = data.payments.filter((payment) => payment.charge_id === charge.id && payment.status === 'CONFIRMED')
    const relatedPaymentAmount = relatedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    const legacyPaymentAmount = relatedPayments.filter((payment) => !paymentIdsWithAllocations.has(payment.id)).reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    return { charge, allocationAmount, relatedPaymentAmount, remaining: Math.max(0, Number(charge.amount || 0) - allocationAmount - legacyPaymentAmount) }
  })

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}><section className="record-modal bulk-invoice-modal" style={{ width: 'min(100%, 960px)' }} role="dialog" aria-modal="true" aria-labelledby="store-inspection-title"><div className="modal-heading"><div><p className="eyebrow">อ่านจาก localStorage · baanjai-store</p><h2 id="store-inspection-title">ตรวจสอบข้อมูลระบบ</h2></div><button className="icon-button" onClick={close} aria-label="ปิด"><X size={19} /></button></div><h3>=== Browser ปัจจุบัน ===</h3><div className="records-table-wrap"><table className="records-table"><tbody><tr><th>URL</th><td>{data.browser.href}</td></tr><tr><th>Origin</th><td>{data.browser.origin}</td></tr><tr><th>Protocol</th><td>{data.browser.protocol}</td></tr><tr><th>Hostname</th><td>{data.browser.hostname}</td></tr><tr><th>Port</th><td>{data.browser.port || '(default)'}</td></tr></tbody></table></div><h3>=== Local Storage ===</h3><p className="form-hint">Storage Key: baanjai-store</p><div className="bulk-summary"><div><small>charges</small><strong>{data.charges.length}</strong></div><div><small>payments</small><strong>{data.payments.length}</strong></div><div><small>paymentAllocations</small><strong>{data.paymentAllocations.length}</strong></div></div>{data.error && <p className="form-error">{data.error}</p>}<h3>ใบแจ้งหนี้ (charges)</h3><div className="records-table-wrap"><table className="records-table"><thead><tr><th>id</th><th>charge_no</th><th>house_id</th><th>project_id</th><th>amount</th><th>status</th></tr></thead><tbody>{data.charges.map((charge) => <tr key={charge.id}><td>{charge.id}</td><td>{charge.charge_no}</td><td>{charge.house_id}</td><td>{charge.project_id}</td><td>{num(Number(charge.amount || 0))}</td><td>{charge.status}</td></tr>)}{data.charges.length === 0 && <tr><td colSpan={6} className="empty-state">ไม่มีรายการ</td></tr>}</tbody></table></div><h3>การรับชำระ (payments)</h3><div className="records-table-wrap"><table className="records-table"><thead><tr><th>id</th><th>payment_no</th><th>charge_id</th><th>amount</th><th>status</th></tr></thead><tbody>{data.payments.map((payment) => <tr key={payment.id}><td>{payment.id}</td><td>{payment.payment_no}</td><td>{payment.charge_id}</td><td>{num(Number(payment.amount || 0))}</td><td>{payment.status}</td></tr>)}{data.payments.length === 0 && <tr><td colSpan={5} className="empty-state">ไม่มีรายการ</td></tr>}</tbody></table></div><h3>การจัดสรรการชำระ (paymentAllocations)</h3><div className="records-table-wrap"><table className="records-table"><thead><tr><th>payment_id</th><th>charge_id</th><th>amount</th></tr></thead><tbody>{data.paymentAllocations.map((allocation, index) => <tr key={`${allocation.payment_id}-${allocation.charge_id}-${index}`}><td>{allocation.payment_id}</td><td>{allocation.charge_id}</td><td>{num(Number(allocation.amount || 0))}</td></tr>)}{data.paymentAllocations.length === 0 && <tr><td colSpan={3} className="empty-state">ไม่มีรายการ</td></tr>}</tbody></table></div><h3>สรุปยอดแยกตามใบแจ้งหนี้</h3><p className="form-hint">ยอด payments คือรายการ CONFIRMED ที่ charge_id ตรงกับใบแจ้งหนี้; ยอดคงเหลือไม่นับ payment ซ้ำเมื่อ payment_id มี allocation อยู่แล้ว</p><div className="records-table-wrap"><table className="records-table"><thead><tr><th>ใบแจ้งหนี้</th><th>ยอดใบแจ้งหนี้</th><th>ยอดจาก paymentAllocations</th><th>ยอดจาก payments ที่เกี่ยวข้อง</th><th>ยอดคงเหลือ</th><th>status ที่บันทึก</th></tr></thead><tbody>{summaries.map(({ charge, allocationAmount, relatedPaymentAmount, remaining }) => <tr key={charge.id}><td><strong>{charge.charge_no}</strong> (id {charge.id})</td><td>{num(Number(charge.amount || 0))}</td><td>{num(allocationAmount)}</td><td>{num(relatedPaymentAmount)}</td><td>{num(remaining)}</td><td>{charge.status}</td></tr>)}{summaries.length === 0 && <tr><td colSpan={6} className="empty-state">ไม่มีรายการ</td></tr>}</tbody></table></div></section></div>
}

function InvoiceCleanupDialog({ preview, close, confirm }: { preview: InvoiceCleanupPreview; close: () => void; confirm: () => void }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}><section className="record-modal" role="dialog" aria-modal="true" aria-labelledby="invoice-cleanup-title"><div className="modal-heading"><div><p className="eyebrow">ล้างเฉพาะข้อมูลทดสอบ</p><h2 id="invoice-cleanup-title">ล้างข้อมูลทดสอบใบแจ้งหนี้</h2></div><button className="icon-button" onClick={close} aria-label="ปิด"><X size={19} /></button></div><p>ตรวจสอบจำนวนก่อนยืนยัน ระบบจะเปลี่ยนเฉพาะ charges, payments และ paymentAllocations</p><div className="bulk-summary"><div><small>ใบแจ้งหนี้</small><strong>{preview.counts.charges} รายการ</strong></div><div><small>รับชำระ</small><strong>{preview.counts.payments} รายการ</strong></div><div><small>จัดสรรการชำระ</small><strong>{preview.counts.paymentAllocations} รายการ</strong></div></div><h3>ข้อมูลที่จะคงไว้</h3><div className="bulk-summary"><div><small>โครงการ</small><strong>{preview.preservedCounts.projects}</strong></div><div><small>บ้าน</small><strong>{preview.preservedCounts.houses}</strong></div><div><small>สมาชิก</small><strong>{preview.preservedCounts.members}</strong></div></div><p className="form-hint">การตั้งค่าน้ำในโครงการ รวมถึงข้อมูลและ collection อื่น จะคงเดิม</p>{preview.error && <p className="form-error">{preview.error}</p>}{preview.result && <p className={preview.result.cleared && preview.result.preserved ? 'form-hint' : 'form-error'}>{preview.result.cleared && preview.result.preserved ? 'ล้างข้อมูลสำเร็จ: ทั้งสาม collection ว่าง และข้อมูลอื่นยังเหมือนเดิม' : 'ตรวจสอบหลังล้างข้อมูลไม่ผ่าน'}</p>}{preview.result && <div className="form-hint">ผลตรวจ: charges {preview.counts.charges}, payments {preview.counts.payments}, paymentAllocations {preview.counts.paymentAllocations} · โครงการ/บ้าน/สมาชิก {preview.result.preserved ? 'ยังอยู่ครบ' : 'ไม่ตรงกับก่อนล้าง'}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={close}>{preview.result ? 'ปิด' : 'ยกเลิก'}</button>{!preview.result && <button type="button" className="primary-button" style={{ background: '#b14f3f' }} disabled={Boolean(preview.error)} onClick={confirm}><Trash2 size={16} />ยืนยันล้างข้อมูล</button>}</div></section></div>
}

function SetupFlow({ store, navigate }: { store: Store; navigate: (screen: Screen, key?: string) => void }) {
  const linkedMembers = store.members.filter((member) => member.house_id && store.houses.some((house) => house.id === member.house_id)).length
  const steps: { label: string; detail: string; screen: Screen; complete: boolean }[] = [
    { label: 'สร้างโครงการ', detail: `${store.projects.length} โครงการ`, screen: 'projects', complete: store.projects.length > 0 },
    { label: 'สร้างบ้าน / แปลง', detail: `${store.houses.length} บ้าน`, screen: 'houses', complete: store.houses.length > 0 },
    { label: 'สร้างข้อมูลลูกบ้าน', detail: `${store.members.length} รายชื่อ`, screen: 'members', complete: store.members.length > 0 },
    { label: 'ผูกลูกบ้านกับบ้าน', detail: `${linkedMembers} ความสัมพันธ์`, screen: 'members', complete: linkedMembers > 0 },
    { label: 'กำหนดอัตราค่าส่วนกลาง', detail: `${store.rates.length} อัตรา`, screen: 'rates', complete: store.rates.length > 0 },
  ]
  const completed = steps.filter((step) => step.complete).length

  return <section className="setup-panel"><div className="setup-heading"><div><p className="eyebrow">PHASE 1 · เริ่มต้นโครงการ</p><h2>ตั้งค่าข้อมูลหลัก</h2><p>ทำตามลำดับเพื่อพร้อมสร้างใบเรียกเก็บ</p></div><span className="setup-progress">{completed} / {steps.length} เสร็จแล้ว</span></div><div className="setup-steps">{steps.map((step, index) => { const available = index === 0 || steps.slice(0, index).every((previous) => previous.complete); return <button className={`setup-step ${step.complete ? 'step-complete' : ''}`} disabled={!available} key={step.label} onClick={() => navigate(step.screen)}><span className="step-index">{step.complete ? <Check size={14} /> : `0${index + 1}`}</span><span className="step-copy"><strong>{step.label}</strong><small>{step.detail}</small></span><span className="step-arrow">›</span></button> })}</div></section>
}

function BulkInvoiceDialog({ store, close, save }: { store: Store; close: () => void; save: (next: Store, created: number, skipped: number, period: string) => void }) {
  const now = new Date()
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [projectId, setProjectId] = useState(String(store.projects[0]?.id ?? ''))
  const [period, setPeriod] = useState(currentPeriod)
  const [dueDate, setDueDate] = useState(() => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`)
  const [houseNoFrom, setHouseNoFrom] = useState('')
  const [houseNoTo, setHouseNoTo] = useState('')
  const [houseLookup, setHouseLookup] = useState<{ target: 'from' | 'to'; query: string } | null>(null)
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [waterReadingInputs, setWaterReadingInputs] = useState<Record<number, { previous: string; current: string }>>({})
  const [error, setError] = useState('')
  const [yearText, monthText] = period.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const periodLabel = `${monthText}/${yearText}`
  const issueDate = `${period}-01`
  const project = store.projects.find((item) => item.id === Number(projectId))
  const waterBillingMode = project?.water_billing_mode ?? 'fixed'
  const collator = new Intl.Collator('th-TH', { numeric: true, sensitivity: 'base' })
  const allHouses = store.houses.filter((house) => house.project_id === Number(projectId))
  const projectHouseIds = new Set(allHouses.map((house) => house.id))
  const projectMembers = store.members.filter((member) => member.status === 'ACTIVE' && member.house_id !== undefined && projectHouseIds.has(member.house_id))
  const normalizedMemberSearch = memberSearch.trim().toLowerCase()
  const matchingProjectMembers = projectMembers.filter((member) => {
    const houseNo = allHouses.find((house) => house.id === member.house_id)?.house_no ?? ''
    return `${person(member)} ${member.member_code} ${houseNo}`.toLowerCase().includes(normalizedMemberSearch)
  })
  const selectedMembers = projectMembers.filter((member) => selectedMemberIds.includes(member.id))
  const selectedHouseIds = new Set(projectMembers.filter((member) => selectedMemberIds.includes(member.id)).map((member) => member.house_id as number))
  const rangeInvalid = Boolean(houseNoFrom && houseNoTo && collator.compare(houseNoFrom, houseNoTo) > 0)
  const houses = allHouses.filter((house) => (!houseNoFrom || collator.compare(house.house_no, houseNoFrom) >= 0) && (!houseNoTo || collator.compare(house.house_no, houseNoTo) <= 0) && (selectedMemberIds.length === 0 || selectedHouseIds.has(house.id))).sort((left, right) => collator.compare(left.house_no, right.house_no))
  const invoices = houses.map((house) => {
    const member = store.members.find((item) => item.house_id === house.id && item.status === 'ACTIVE')
    const rate = store.rates.filter((item) => item.project_id === house.project_id && item.status === 'ACTIVE' && item.effective_from <= issueDate).sort((left, right) => right.effective_from.localeCompare(left.effective_from))[0]
    const exists = store.charges.some((charge) => charge.project_id === house.project_id && charge.house_id === house.id && charge.period === periodLabel)
    const lastWaterCharge = store.charges.filter((charge) => charge.project_id === house.project_id && charge.house_id === house.id && charge.water_current_reading !== undefined && periodKey(charge.period) < periodKey(periodLabel)).sort((left, right) => periodKey(right.period) - periodKey(left.period))[0]
    const previousReadingInput = waterReadingInputs[house.id]?.previous
    const previousReading = previousReadingInput?.trim() ? Number(previousReadingInput) : Number(lastWaterCharge?.water_current_reading ?? 0)
    const currentReadingText = waterReadingInputs[house.id]?.current ?? ''
    const currentReading = currentReadingText.trim() ? Number(currentReadingText) : previousReading
    const waterUnits = Math.max(0, currentReading - previousReading)
    const waterAmount = waterBillingMode === 'metered' ? waterUnits * (project?.water_unit_rate ?? 0) : project?.water_fixed_amount ?? 0
    const charge: Charge = { id: -house.id, charge_no: '', project_id: house.project_id, rate_id: rate?.id ?? 0, house_id: house.id, member_id: member?.id ?? 0, period: periodLabel, amount: rate ? commonFeeForHouse(rate, house) : 0, water_amount: waterAmount, ...(waterBillingMode === 'metered' ? { water_previous_reading: previousReading, water_current_reading: currentReading, water_units: waterUnits } : {}), issued_at: issueDate, due_date: dueDate, status: 'UNPAID' }
    return { house, member, rate, exists, charge, previousReading, currentReading, hasCurrentReading: currentReadingText.trim() !== '', waterUnits, waterAmount, total: rate && member ? invoiceBreakdown(store, charge).totalDue : 0 }
  })
  const readyInvoices = invoices.filter((item) => item.member && item.rate && !item.exists)
  const duplicateCount = invoices.filter((item) => item.exists).length
  const missingDataCount = invoices.filter((item) => !item.exists && (!item.member || !item.rate)).length
  const estimate = readyInvoices.reduce((sum, item) => sum + item.total, 0)

  function houseSearchPicker(target: 'from' | 'to', label: string, value: string, setValue: (value: string) => void) {
    const open = houseLookup?.target === target
    const query = open ? houseLookup.query.trim().toLowerCase() : ''
    const results = allHouses.filter((house) => `${house.house_no} ${house.plot_no} ${house.house_code}`.toLowerCase().includes(query)).slice(0, 20)
    return <div style={{ position: 'relative', display: 'grid', gap: 4 }}><label>{label}<span style={{ display: 'flex', gap: 4 }}><input type="search" value={open ? houseLookup.query : ''} placeholder={value || 'กดค้นหาเพื่อเลือกบ้าน'} onFocus={() => setHouseLookup({ target, query: '' })} onChange={(event) => setHouseLookup({ target, query: event.target.value })} /><button type="button" className="icon-button" title={`ค้นหา${label}`} aria-label={`ค้นหา${label}`} onClick={() => setHouseLookup(open ? null : { target, query: '' })}><Search size={16} /></button></span></label>{value && !open && <small>เลือกแล้ว: {value}</small>}{open && <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 8, display: 'grid', gap: 2, maxHeight: 180, overflowY: 'auto', padding: 6, border: '1px solid #dfe6df', borderRadius: 5, background: '#fff', boxShadow: '0 8px 20px #203d3520' }}>{results.map((house) => <button type="button" className="text-button" key={house.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { setValue(house.house_no); setHouseLookup(null) }}>บ้าน {house.house_no} · แปลง {house.plot_no} · {house.house_code}</button>)}{results.length === 0 && <small>ไม่พบบ้านที่ค้นหา</small>}{allHouses.length > results.length && !query && <small>แสดง 20 รายการแรก พิมพ์เพื่อค้นหาเพิ่มเติม</small>}</div>}</div>
  }

  function changePeriod(value: string) {
    setPeriod(value)
    setWaterReadingInputs({})
    if (!value) return
    const [nextYear, nextMonth] = value.split('-').map(Number)
    setDueDate(`${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(new Date(nextYear, nextMonth, 0).getDate()).padStart(2, '0')}`)
  }

  function updateWaterReading(houseId: number, key: 'previous' | 'current', value: string, defaultPreviousReading: number) {
    setWaterReadingInputs((previous) => ({ ...previous, [houseId]: { previous: previous[houseId]?.previous?.trim() ? previous[houseId].previous : String(defaultPreviousReading), current: previous[houseId]?.current ?? '', [key]: value } }))
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (rangeInvalid) {
      setError('บ้านเลขที่เริ่มต้นต้องไม่มากกว่าบ้านเลขที่สิ้นสุด')
      return
    }
    if (!Number(projectId) || !year || !month || readyInvoices.length === 0) {
      setError('ไม่มีบ้านที่พร้อมออกใบแจ้งหนี้ในรอบนี้')
      return
    }
    if (waterBillingMode === 'metered' && readyInvoices.some((item) => !item.hasCurrentReading || item.currentReading < item.previousReading)) {
      setError('กรุณากรอกเลขมิเตอร์ปัจจุบันให้ครบ และต้องไม่น้อยกว่าเลขครั้งก่อน')
      return
    }
    const readings = Object.fromEntries(readyInvoices.map((item) => [item.house.id, { previous: item.previousReading, current: item.currentReading }]))
    const result = generateMonthlyInvoices(store, new Date(year, month - 1, 1), Number(projectId), dueDate, houses.map((house) => house.id), readings)
    save(result.store, result.created, result.skipped, result.period)
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}><section className="record-modal bulk-invoice-modal" role="dialog" aria-modal="true" aria-labelledby="bulk-invoice-title"><div className="modal-heading"><div><p className="eyebrow">การเงิน · สร้างแบบชุด</p><h2 id="bulk-invoice-title">สร้างใบเรียกเก็บให้ลูกบ้าน</h2></div><button className="icon-button" onClick={close} aria-label="ปิด"><X size={19} /></button></div><form onSubmit={submit}><label>โครงการ<select required value={projectId} onChange={(event) => { setProjectId(event.target.value); setWaterReadingInputs({}); setSelectedMemberIds([]); setMemberSearch(''); setHouseNoFrom(''); setHouseNoTo(''); setHouseLookup(null) }}>{store.projects.map((project) => <option value={project.id} key={project.id}>{project.project_code} · {project.project_name}</option>)}</select></label><label>รอบเรียกเก็บ<input required type="month" value={period} onChange={(event) => changePeriod(event.target.value)} /></label><label>วันครบกำหนด<input required type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label><div className="house-range">{houseSearchPicker('from', 'บ้านเลขที่เริ่มต้น', houseNoFrom, setHouseNoFrom)}<span>ถึง</span>{houseSearchPicker('to', 'บ้านเลขที่สิ้นสุด', houseNoTo, setHouseNoTo)}<div style={{ gridColumn: '1 / -1', display: 'grid', gap: 6 }}><label style={{ display: 'grid', gap: 6 }}>ค้นหาลูกบ้าน<input type="search" placeholder="ชื่อ, รหัสสมาชิก หรือบ้านเลขที่" value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} /></label><div style={{ display: 'grid', gap: 4, maxHeight: 130, overflowY: 'auto' }}>{memberSearch.trim() ? matchingProjectMembers.map((member) => { const house = allHouses.find((item) => item.id === member.house_id); return <label key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 30, fontSize: 12 }}><input type="checkbox" checked={selectedMemberIds.includes(member.id)} onChange={(event) => setSelectedMemberIds((previous) => event.target.checked ? [...previous, member.id] : previous.filter((id) => id !== member.id))} style={{ width: 16, height: 16, minHeight: 16, flex: '0 0 16px', margin: 0 }} /><span>{person(member)} · บ้าน {house?.house_no}</span></label> }) : <small>พิมพ์เพื่อค้นหาลูกบ้าน</small>}{memberSearch.trim() && matchingProjectMembers.length === 0 && <small>ไม่พบลูกบ้าน</small>}</div>{selectedMembers.length > 0 && <div style={{ display: 'grid', gap: 4 }}><small>เลือกแล้ว {selectedMembers.length} คน</small>{selectedMembers.map((member) => { const house = allHouses.find((item) => item.id === member.house_id); return <button type="button" className="text-button" key={member.id} onClick={() => setSelectedMemberIds((previous) => previous.filter((id) => id !== member.id))}>{person(member)} · บ้าน {house?.house_no} · นำออก</button> })}</div>}<small>ไม่เลือกลูกบ้านเพื่อใช้ช่วงบ้านเลขที่ หรือออกบิลทุกบ้านในโครงการ</small></div><small>เว้นว่างบ้านเลขที่เริ่มต้นและสิ้นสุดเพื่อไม่กรองตามช่วง</small></div><div className="bulk-summary"><div><small>บ้านในช่วงที่เลือก</small><strong>{houses.length}</strong></div><div><small>พร้อมออกบิล</small><strong>{readyInvoices.length}</strong></div><div><small>มีบิลแล้ว</small><strong>{duplicateCount}</strong></div><div><small>ยอดประมาณการ</small><strong>฿ {num(estimate)}</strong></div></div><div className="bulk-preview"><div className="bulk-preview-heading"><strong>รายการที่จะออก</strong><span>{periodLabel}</span></div><div className="bulk-preview-list">{readyInvoices.length > 0 ? readyInvoices.map((item) => <div className="bulk-preview-row" key={item.house.id}>{waterBillingMode === 'metered' ? <><span>บ้าน {item.house.house_no} · {item.house.plot_no} · {person(item.member)}</span><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(80px, 1fr))', gap: 8 }}><label>มิเตอร์ครั้งก่อน<input type="number" min="0" value={waterReadingInputs[item.house.id]?.previous?.trim() ? waterReadingInputs[item.house.id].previous : String(item.previousReading)} onChange={(event) => updateWaterReading(item.house.id, 'previous', event.target.value, item.previousReading)} /></label><label>มิเตอร์ครั้งนี้<input required type="number" min={item.previousReading} value={waterReadingInputs[item.house.id]?.current ?? ''} onChange={(event) => updateWaterReading(item.house.id, 'current', event.target.value, item.previousReading)} /></label></div><span>{num(item.waterUnits)} หน่วย · ค่าน้ำ ฿ {num(item.waterAmount)}</span><strong>รวม ฿ {num(item.total)}</strong></> : <><span>บ้าน {item.house.house_no} · {item.house.plot_no} · {person(item.member)}</span><span>ค่าน้ำ ฿ {num(item.waterAmount)}</span><strong>รวม ฿ {num(item.total)}</strong></>}</div>) : <p className="empty-state">ไม่มีรายการที่พร้อมออกบิล</p>}</div></div>{missingDataCount > 0 && <p className="form-hint">ข้าม {missingDataCount} บ้าน เนื่องจากยังไม่มีลูกบ้านที่ใช้งานหรืออัตราค่าส่วนกลางที่มีผลในรอบนี้</p>}{rangeInvalid && <p className="form-error">บ้านเลขที่เริ่มต้นต้องไม่มากกว่าบ้านเลขที่สิ้นสุด</p>}{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={close}>ยกเลิก</button><button className="primary-button" type="submit" disabled={readyInvoices.length === 0 || rangeInvalid}><FileText size={16} />สร้าง {readyInvoices.length} ใบแจ้งหนี้</button></div></form></section></div>
}

function WaterList({ store }: { store: Store }) {
  const [projectFilter, setProjectFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [houseSearch, setHouseSearch] = useState('')
  const formatMoney = (value: number) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
  const formatReading = (value?: number) => value === undefined ? '—' : new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 }).format(value)
  const currentDate = new Date()
  const currentPeriod = `${String(currentDate.getMonth() + 1).padStart(2, '0')}/${currentDate.getFullYear()}`
  const today = currentDate.toISOString().slice(0, 10)
  const waterCharges = store.charges.filter((charge) => charge.water_amount !== undefined || charge.water_units !== undefined || charge.water_current_reading !== undefined)
  const periods = [...new Set([...waterCharges.map((charge) => charge.period), currentPeriod])].sort((left, right) => periodKey(right) - periodKey(left))
  const statusLabels: Record<string, string> = { NOT_BILLED: 'ยังไม่ออกบิล', ISSUED: 'ออกบิลแล้ว', PAID: 'ชำระแล้ว', PARTIAL: 'ชำระบางส่วน', OVERDUE: 'ค้างชำระ' }
  const statusClass: Record<string, string> = { NOT_BILLED: 'status-neutral', ISSUED: 'status-progress', PAID: 'status-good', PARTIAL: 'status-progress', OVERDUE: 'status-warn' }
  type WaterRow = { key: string; project: Project; house: House; charge?: Charge; period: string; mode: WaterBillingMode; previous?: number; current?: number; units?: number; rate: number; waterAmount: number; commonFee: number; otherFees: number; total: number; status: string }
  const rows: WaterRow[] = waterCharges.flatMap((charge) => {
    const project = store.projects.find((item) => item.id === charge.project_id)
    const house = store.houses.find((item) => item.id === charge.house_id)
    if (!project || !house) return []
    const mode: WaterBillingMode = charge.water_current_reading !== undefined || charge.water_units !== undefined ? 'metered' : project.water_billing_mode ?? 'fixed'
    const balance = chargeBalance(store, charge)
    const total = charge.amount + (charge.water_amount ?? 0) + (charge.penalty_amount ?? 0)
    const paid = Math.max(0, total - balance)
    const status = balance <= 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : charge.status === 'OVERDUE' || charge.due_date < today ? 'OVERDUE' : 'ISSUED'
    return [{ key: `charge-${charge.id}`, project, house, charge, period: charge.period, mode, previous: charge.water_previous_reading, current: charge.water_current_reading, units: charge.water_units, rate: mode === 'metered' ? project.water_unit_rate ?? 0 : charge.water_amount ?? project.water_fixed_amount ?? 0, waterAmount: charge.water_amount ?? 0, commonFee: charge.amount, otherFees: charge.penalty_amount ?? 0, total, status }]
  })
  if (periodFilter !== 'all') {
    for (const house of store.houses) {
      if (projectFilter !== 'all' && house.project_id !== Number(projectFilter)) continue
      const project = store.projects.find((item) => item.id === house.project_id)
      if (!project || store.charges.some((charge) => charge.project_id === project.id && charge.house_id === house.id && charge.period === periodFilter)) continue
      const mode = project.water_billing_mode ?? 'fixed'
      const previousCharge = waterCharges.filter((charge) => charge.project_id === project.id && charge.house_id === house.id && charge.water_current_reading !== undefined && periodKey(charge.period) < periodKey(periodFilter)).sort((left, right) => periodKey(right.period) - periodKey(left.period))[0]
      rows.push({ key: `not-billed-${project.id}-${house.id}-${periodFilter}`, project, house, period: periodFilter, mode, previous: previousCharge?.water_current_reading, rate: mode === 'metered' ? project.water_unit_rate ?? 0 : project.water_fixed_amount ?? 0, waterAmount: mode === 'fixed' ? project.water_fixed_amount ?? 0 : 0, commonFee: 0, otherFees: 0, total: 0, status: 'NOT_BILLED' })
    }
  }
  const visibleRows = rows.filter((row) => (projectFilter === 'all' || row.project.id === Number(projectFilter)) && (periodFilter === 'all' || row.period === periodFilter) && (statusFilter === 'all' || row.status === statusFilter) && `${row.house.house_no} ${row.house.plot_no} ${row.house.house_code}`.toLowerCase().includes(houseSearch.trim().toLowerCase())).sort((left, right) => periodKey(right.period) - periodKey(left.period) || left.house.house_no.localeCompare(right.house.house_no, 'th', { numeric: true }))
  const visibleBilledRows = visibleRows.filter((row) => row.charge)
  const houseCount = store.houses.filter((house) => (projectFilter === 'all' || house.project_id === Number(projectFilter)) && `${house.house_no} ${house.plot_no} ${house.house_code}`.toLowerCase().includes(houseSearch.trim().toLowerCase())).length
  const totalWater = visibleBilledRows.reduce((sum, row) => sum + row.waterAmount, 0)
  const issuedCount = visibleBilledRows.length
  const paidCount = visibleBilledRows.filter((row) => row.status === 'PAID').length
  const outstandingCount = visibleBilledRows.filter((row) => ['ISSUED', 'PARTIAL', 'OVERDUE'].includes(row.status)).length
  const showMeterColumns = visibleRows.some((row) => row.mode === 'metered')

  return <><section className="water-filters"><label>โครงการ<select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}><option value="all">ทุกโครงการ</option>{store.projects.map((project) => <option key={project.id} value={project.id}>{project.project_code} · {project.project_name}</option>)}</select></label><label>รอบบิล / เดือน<select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)}><option value="all">ทุกเดือน</option>{periods.map((period) => <option key={period} value={period}>{period}</option>)}</select></label><label>สถานะ<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">ทุกสถานะ</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="water-house-search">บ้านเลขที่<input type="search" value={houseSearch} onChange={(event) => setHouseSearch(event.target.value)} placeholder="ค้นหาบ้านเลขที่ / แปลง" /></label></section><section className="summary-grid water-summary"><article className="summary-card"><p>จำนวนบ้านทั้งหมด</p><strong>{houseCount}</strong></article><article className="summary-card"><p>รายการค่าน้ำ</p><strong>{issuedCount}</strong></article><article className="summary-card"><p>ยอดค่าน้ำรวม</p><strong>฿ {formatMoney(totalWater)}</strong></article><article className="summary-card"><p>ออกบิลแล้ว</p><strong>{issuedCount}</strong></article><article className="summary-card"><p>ชำระแล้ว</p><strong>{paidCount}</strong></article><article className="summary-card"><p>ค้างชำระ</p><strong>{outstandingCount}</strong></article></section><section className="module-panel"><div className="module-toolbar"><span>{visibleRows.length} รายการ <small>· รายการค่าน้ำ</small></span></div><div className="records-table-wrap"><table className="records-table water-records-table"><thead><tr><th>รอบบิล / เดือน</th><th>บ้านเลขที่</th>{showMeterColumns && <><th>มิเตอร์ครั้งก่อน</th><th>มิเตอร์ครั้งนี้</th><th>หน่วยที่ใช้</th></>}<th>อัตราค่าน้ำ</th><th>ค่าน้ำ</th><th>ค่าส่วนกลาง</th><th>ค่าปรับ / ค่าใช้จ่ายอื่น</th><th>ยอดรวมใบแจ้งหนี้</th><th>สถานะ</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.key}><td>{row.period}</td><td><strong>{row.house.house_no}</strong><small className="date-cell">{row.house.plot_no}</small></td>{showMeterColumns && <>{row.mode === 'metered' ? <><td>{formatReading(row.previous)}</td><td>{formatReading(row.current)}</td><td>{formatReading(row.units)}</td></> : <><td>—</td><td>—</td><td>—</td></>}</>}<td>{row.mode === 'fixed' ? `฿ ${formatMoney(row.rate)} / บ้าน` : `฿ ${formatMoney(row.rate)} / หน่วย`}</td><td>{row.charge || row.mode === 'fixed' ? `฿ ${formatMoney(row.waterAmount)}` : '—'}</td><td>{row.charge ? `฿ ${formatMoney(row.commonFee)}` : '—'}</td><td>{row.charge ? `฿ ${formatMoney(row.otherFees)}` : '—'}</td><td>{row.charge ? `฿ ${formatMoney(row.total)}` : '—'}</td><td><span className={`status-pill ${statusClass[row.status]}`}>{statusLabels[row.status]}</span></td></tr>)}{visibleRows.length === 0 && <tr><td colSpan={showMeterColumns ? 11 : 8} className="empty-state">ยังไม่มีรายการค่าน้ำ</td></tr>}</tbody></table></div></section></>
}

type CommonFeeReportRow = {
  house: House
  member?: Member
  charge?: Charge
  rate?: Rate
  commonFee?: number
  waterAmount: number
  penalty: number
  arrears: number
  billedTotal?: number
  paid: number
  balance: number
  status: string
}

function ProjectReports({ store, view }: { store: Store; view: ReportView }) {
  const now = new Date()
  const currentPeriod = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
  const [projectFilter, setProjectFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState(currentPeriod)
  const [statusFilter, setStatusFilter] = useState('all')
  const periods = [...new Set([...store.charges.map((charge) => charge.period), currentPeriod])].sort((left, right) => periodKey(right) - periodKey(left))
  const [month, year] = periodFilter.split('/')
  const effectiveDate = `${year}-${month}-01`
  const today = now.toISOString().slice(0, 10)
  const reportCharges = store.charges.filter((charge) => charge.period === periodFilter && (projectFilter === 'all' || charge.project_id === Number(projectFilter)))
  const reportRows: CommonFeeReportRow[] = store.houses
    .filter((house) => projectFilter === 'all' || house.project_id === Number(projectFilter))
    .map((house) => {
      const charge = reportCharges.find((item) => item.house_id === house.id)
      const rate = charge
        ? store.rates.find((item) => item.id === charge.rate_id)
        : store.rates.filter((item) => item.project_id === house.project_id && item.status === 'ACTIVE' && item.effective_from <= effectiveDate).sort((left, right) => right.effective_from.localeCompare(left.effective_from))[0]
      const member = store.members.find((item) => item.house_id === house.id && item.status === 'ACTIVE')
      const breakdown = charge ? invoiceBreakdown(store, charge) : undefined
      const status = !charge
        ? 'NOT_BILLED'
        : charge.status === 'PAID' || (breakdown?.current ?? 0) <= 0
          ? 'PAID'
          : (breakdown?.paid ?? 0) > 0 || charge.status === 'PARTIAL'
            ? 'PARTIAL'
            : charge.status === 'OVERDUE' || charge.due_date < today
              ? 'OVERDUE'
              : 'UNPAID'
      const waterAmount = charge?.water_amount ?? 0
      const penalty = charge?.penalty_amount ?? 0
      return {
        house,
        member,
        charge,
        rate,
        commonFee: charge?.amount,
        waterAmount,
        penalty,
        arrears: breakdown?.arrears ?? 0,
        billedTotal: charge ? charge.amount + waterAmount + penalty : undefined,
        paid: breakdown?.paid ?? 0,
        balance: breakdown?.totalDue ?? 0,
        status,
      }
    })
    .sort((left, right) => left.house.house_no.localeCompare(right.house.house_no, 'th', { numeric: true }))
  const statusLabels: Record<string, string> = { NOT_BILLED: 'ยังไม่ออกบิล', UNPAID: 'รอชำระ', PARTIAL: 'ชำระบางส่วน', PAID: 'ชำระแล้ว', OVERDUE: 'เกินกำหนด' }
  const visibleRows = reportRows.filter((row) => statusFilter === 'all' || row.status === statusFilter)
  const billedRows = reportRows.filter((row) => row.charge)
  const totalBilled = billedRows.reduce((sum, row) => sum + (row.billedTotal ?? 0), 0)
  const totalPaid = billedRows.reduce((sum, row) => sum + row.paid, 0)
  const totalBalance = billedRows.reduce((sum, row) => sum + row.balance, 0)
  const formatMoney = (value: number) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)

  function exportCsv() {
    const header = ['รอบบิล', 'บ้านเลขที่', 'แปลง', 'ลูกบ้าน', 'พื้นที่ดิน (ตร.ว.)', 'อัตรา (บาท/ตร.ว.)', 'ค่าส่วนกลาง', 'ค่าน้ำ', 'ค่าปรับ', 'ยอดค้างเดิม', 'ยอดเรียกเก็บ', 'รับชำระแล้ว', 'คงค้าง', 'สถานะ']
    const values = visibleRows.map((row) => [periodFilter, row.house.house_no, row.house.plot_no, person(row.member), row.house.land_area, row.rate?.amount ?? '', row.commonFee ?? '', row.waterAmount, row.penalty, row.arrears, row.billedTotal ?? '', row.paid, row.balance, statusLabels[row.status]])
    const csv = [header, ...values].map((record) => record.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `common-fees-${periodFilter.replace('/', '-')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return <section className="project-report-print">
    {view === 'receivables' ? <OverdueReceivablesReport store={store} /> : <>
    <header className="report-print-header"><h2>รายงานค่าส่วนกลางและสถานะรับชำระ</h2><p>{store.projects.find((project) => project.id === Number(projectFilter))?.project_name ?? 'ทุกโครงการ'} · รอบบิล {periodFilter}</p></header>
    <section className="water-filters report-filters no-print"><label>โครงการ<select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}><option value="all">ทุกโครงการ</option>{store.projects.map((project) => <option key={project.id} value={project.id}>{project.project_code} · {project.project_name}</option>)}</select></label><label>รอบบิล<select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)}>{periods.map((period) => <option value={period} key={period}>{period}</option>)}</select></label><label>สถานะ<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">ทุกสถานะ</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><div className="report-actions"><button className="secondary-button" onClick={exportCsv}><ArrowDownToLine size={15} />ส่งออก CSV</button><button className="secondary-button" onClick={() => window.print()}><Printer size={15} />พิมพ์รายงาน</button></div></section>
    <section className="summary-grid report-summary-grid"><article className="summary-card"><p>บ้านในรายงาน</p><strong>{reportRows.length}</strong></article><article className="summary-card"><p>ออกบิลแล้ว</p><strong>{billedRows.length}</strong></article><article className="summary-card"><p>ยอดเรียกเก็บรอบนี้</p><strong>฿ {formatMoney(totalBilled)}</strong></article><article className="summary-card"><p>รับชำระแล้ว</p><strong>฿ {formatMoney(totalPaid)}</strong></article><article className="summary-card"><p>ยอดคงค้าง</p><strong>฿ {formatMoney(totalBalance)}</strong></article></section>
    <section className="module-panel"><div className="module-toolbar"><span>{visibleRows.length} รายการ <small>· รอบบิล {periodFilter}</small></span></div><div className="records-table-wrap"><table className="records-table report-table"><thead><tr><th>บ้าน / แปลง</th><th>ลูกบ้าน</th><th>พื้นที่ดิน</th><th>อัตรา / ตร.ว.</th><th>ค่าส่วนกลาง</th><th>ค่าน้ำ</th><th>ค่าปรับ</th><th>ค้างเดิม</th><th>ยอดเรียกเก็บ</th><th>รับชำระ</th><th>คงค้าง</th><th>สถานะ</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.house.id}><td><strong>{row.house.house_no}</strong><small className="date-cell">{row.house.plot_no}</small></td><td>{person(row.member)}</td><td>{new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 }).format(row.house.land_area)} ตร.ว.</td><td>{row.rate ? `฿ ${formatMoney(row.rate.amount)}` : '—'}</td><td>{row.charge ? `฿ ${formatMoney(row.commonFee ?? 0)}` : '—'}</td><td>{row.charge ? `฿ ${formatMoney(row.waterAmount)}` : '—'}</td><td>{row.charge ? `฿ ${formatMoney(row.penalty)}` : '—'}</td><td>{row.charge ? `฿ ${formatMoney(row.arrears)}` : '—'}</td><td>{row.charge ? `฿ ${formatMoney(row.billedTotal ?? 0)}` : '—'}</td><td>{row.charge ? `฿ ${formatMoney(row.paid)}` : '—'}</td><td>{row.charge ? `฿ ${formatMoney(row.balance)}` : '—'}</td><td><span className={`status-pill ${row.status === 'PAID' ? 'status-good' : row.status === 'OVERDUE' ? 'status-warn' : row.status === 'NOT_BILLED' ? 'status-neutral' : 'status-progress'}`}>{statusLabels[row.status]}</span></td></tr>)}{visibleRows.length === 0 && <tr><td colSpan={12} className="empty-state">ไม่พบรายการในตัวกรองนี้</td></tr>}</tbody></table></div></section>
    </>}
  </section>
}

type OverdueReportRow = { charge: Charge; house: House; member?: Member; outstanding: number; paid: number; daysOverdue: number; ageBucket: '1-30' | '31-60' | '61-90' | '90+' }

function OverdueReceivablesReport({ store }: { store: Store }) {
  const today = new Date().toISOString().slice(0, 10)
  const [projectFilter, setProjectFilter] = useState('all')
  const [ageFilter, setAgeFilter] = useState('all')
  const formatMoney = (value: number) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
  const rows: OverdueReportRow[] = store.charges.flatMap((charge) => {
    if (charge.due_date >= today || (projectFilter !== 'all' && charge.project_id !== Number(projectFilter))) return []
    const outstanding = chargeBalance(store, charge)
    if (outstanding <= 0) return []
    const dueDate = new Date(`${charge.due_date}T00:00:00`)
    const todayDate = new Date(`${today}T00:00:00`)
    const daysOverdue = Math.max(1, Math.floor((todayDate.getTime() - dueDate.getTime()) / 86400000))
    const ageBucket: OverdueReportRow['ageBucket'] = daysOverdue <= 30 ? '1-30' : daysOverdue <= 60 ? '31-60' : daysOverdue <= 90 ? '61-90' : '90+'
    const house = store.houses.find((item) => item.id === charge.house_id)
    if (!house) return []
    return [{ charge, house, member: store.members.find((item) => item.house_id === house.id && item.status === 'ACTIVE'), outstanding, paid: Math.max(0, charge.amount + (charge.water_amount ?? 0) + (charge.penalty_amount ?? 0) - outstanding), daysOverdue, ageBucket }]
  }).filter((row) => ageFilter === 'all' || row.ageBucket === ageFilter).sort((left, right) => right.daysOverdue - left.daysOverdue || right.outstanding - left.outstanding)
  const totalOutstanding = rows.reduce((sum, row) => sum + row.outstanding, 0)
  const bucketTotals: Record<OverdueReportRow['ageBucket'], number> = { '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
  for (const row of rows) bucketTotals[row.ageBucket] += row.outstanding
  const projectName = store.projects.find((project) => project.id === Number(projectFilter))?.project_name ?? 'ทุกโครงการ'
  const ageLabels: Record<OverdueReportRow['ageBucket'], string> = { '1-30': '1–30 วัน', '31-60': '31–60 วัน', '61-90': '61–90 วัน', '90+': 'เกิน 90 วัน' }

  function exportCsv() {
    const header = ['บ้านเลขที่', 'แปลง', 'ลูกบ้าน', 'โทรศัพท์', 'เลขที่ใบแจ้งหนี้', 'รอบบิล', 'วันครบกำหนด', 'เกินกำหนด (วัน)', 'ยอดชำระแล้ว', 'ยอดคงค้าง', 'อายุหนี้']
    const values = rows.map((row) => [row.house.house_no, row.house.plot_no, person(row.member), row.member?.phone ?? '', row.charge.charge_no, row.charge.period, row.charge.due_date, row.daysOverdue, row.paid, row.outstanding, ageLabels[row.ageBucket]])
    const csv = [header, ...values].map((record) => record.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `overdue-receivables-${today}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return <>
    <header className="report-print-header"><h2>รายงานลูกหนี้ค้างชำระ</h2><p>{projectName} · ข้อมูล ณ {today}</p></header>
    <section className="water-filters report-filters no-print"><label>โครงการ<select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}><option value="all">ทุกโครงการ</option>{store.projects.map((project) => <option key={project.id} value={project.id}>{project.project_code} · {project.project_name}</option>)}</select></label><label>อายุหนี้<select value={ageFilter} onChange={(event) => setAgeFilter(event.target.value)}><option value="all">ทุกช่วงอายุ</option><option value="1-30">1–30 วัน</option><option value="31-60">31–60 วัน</option><option value="61-90">61–90 วัน</option><option value="90+">เกิน 90 วัน</option></select></label><div className="report-actions"><button className="secondary-button" onClick={exportCsv}><ArrowDownToLine size={15} />ส่งออก CSV</button><button className="secondary-button" onClick={() => window.print()}><Printer size={15} />พิมพ์รายงาน</button></div></section>
    <section className="summary-grid report-summary-grid"><article className="summary-card"><p>ใบแจ้งหนี้ค้างชำระ</p><strong>{rows.length}</strong></article><article className="summary-card"><p>ยอดค้างรวม</p><strong>฿ {formatMoney(totalOutstanding)}</strong></article>{(Object.keys(ageLabels) as OverdueReportRow['ageBucket'][]).map((bucket) => <article className="summary-card" key={bucket}><p>{ageLabels[bucket]}</p><strong>฿ {formatMoney(bucketTotals[bucket])}</strong></article>)}</section>
    <section className="module-panel"><div className="module-toolbar"><span>{rows.length} รายการ <small>· ลูกหนี้ค้างชำระ</small></span></div><div className="records-table-wrap"><table className="records-table report-table"><thead><tr><th>บ้าน / แปลง</th><th>ลูกบ้าน</th><th>ใบแจ้งหนี้</th><th>รอบบิล</th><th>ครบกำหนด</th><th>เกินกำหนด</th><th>รับชำระแล้ว</th><th>คงค้าง</th><th>อายุหนี้</th></tr></thead><tbody>{rows.map((row) => <tr key={row.charge.id}><td><strong>{row.house.house_no}</strong><small className="date-cell">{row.house.plot_no}</small></td><td>{person(row.member)}<small className="date-cell">{row.member?.phone ?? ''}</small></td><td>{row.charge.charge_no}</td><td>{row.charge.period}</td><td>{row.charge.due_date}</td><td>{row.daysOverdue} วัน</td><td>฿ {formatMoney(row.paid)}</td><td><strong>฿ {formatMoney(row.outstanding)}</strong></td><td><span className={`status-pill ${row.ageBucket === '90+' ? 'status-warn' : 'status-progress'}`}>{ageLabels[row.ageBucket]}</span></td></tr>)}{rows.length === 0 && <tr><td colSpan={9} className="empty-state">ไม่มีใบแจ้งหนี้ค้างชำระ</td></tr>}</tbody></table></div></section>
  </>
}

function Module({ screen, store, query, setQuery, onEdit, onDelete }: { screen: ModuleScreen | 'water' | 'reports'; store: Store; query: string; setQuery: (value: string) => void; onEdit: (id: number) => void; onDelete: (id: number) => void }) {
  const [printTarget, setPrintTarget] = useState<PrintTarget | null>(null)
  if (screen === 'reports') return <ProjectReports store={store} view={query === 'receivables' ? 'receivables' : 'common-fees'} />
  if (screen === 'water') return <WaterList store={store} />
  const houseFor = (id: number) => store.houses.find((house) => house.id === id)
  const memberFor = (id: number) => store.members.find((member) => member.id === id)
  const rows: { id: number; cells: string[]; locked?: boolean; cannotDelete?: boolean }[] = screen === 'projects' ? store.projects.map((item) => ({ id: item.id, cells: [item.project_code, item.project_name, item.address, item.phone, item.status, item.created_at] }))
    : screen === 'houses' ? store.houses.map((item) => ({ id: item.id, cells: [item.house_code, `${item.plot_no} · ${item.house_no}`, `${item.house_type} · ที่ดิน ${item.land_area} ตร.ว. · บ้าน ${item.house_area} ตร.ม.`, person(store.members.find((member) => member.house_id === item.id)), item.status, item.house_no] }))
    : screen === 'members' ? store.members.map((item) => ({ id: item.id, cells: [item.member_code, person(item), `${item.phone} · LINE ${item.line_id} · ${item.email}`, houseFor(item.house_id ?? 0)?.plot_no ?? '-', item.status, item.phone] }))
    : screen === 'rates' ? store.rates.map((item) => ({ id: item.id, cells: [String(item.id), `฿ ${num(item.amount)}`, item.unit, store.projects.find((project) => project.id === item.project_id)?.project_name ?? '-', item.status, item.effective_from] }))
    : screen === 'charges' ? store.charges.map((item) => { const breakdown = invoiceBreakdown(store, item); const hasPaymentReference = store.payments.some((payment) => payment.charge_id === item.id) || store.paymentAllocations.some((allocation) => allocation.charge_id === item.id); const waterDetail = (item.water_amount ?? 0) > 0 ? ` · ค่าน้ำ ${num(item.water_amount ?? 0)}${item.water_units === undefined ? '' : ` (${num(item.water_units)} หน่วย)`}` : ''; return { id: item.id, locked: hasPaymentReference, cannotDelete: hasPaymentReference || item.status === 'PAID' || item.status === 'PARTIAL', cells: [item.charge_no, `${houseFor(item.house_id)?.plot_no} · ${person(memberFor(item.member_id))}`, `งวด ${item.period} · ค่าส่วนกลาง ${num(item.amount)}${waterDetail} · ค้างเดิม ${num(breakdown.arrears)} · ค่าปรับ ${num(breakdown.penalty)}`, `฿ ${num(breakdown.totalDue)}`, item.status, item.due_date] } })
    : screen === 'payments' ? store.payments.map((item) => ({ id: item.id, cells: [item.payment_no, `${houseFor(item.house_id)?.plot_no} · ${person(memberFor(item.member_id))}`, `${item.payment_method} · ${item.bank_account} · อ้างอิง ${item.reference_no || '-'}`, `฿ ${num(item.amount)}`, item.status, item.payment_date] }))
    : (store[screen] as Item[]).map((item) => ({ id: item.id, cells: [String(item.id).padStart(4, '0'), item.title, item.detail, item.amount ? `฿ ${num(item.amount)}` : '-', item.status, item.date] }))
  const filtered = rows.filter((row) => row.cells.join(' ').toLowerCase().includes(query.toLowerCase()))
  function openPrint(id: number) {
    if (screen === 'charges') {
      const record = store.charges.find((charge) => charge.id === id)
      if (record) setPrintTarget({ kind: 'charge', record })
    } else if (screen === 'payments') {
      const record = store.payments.find((payment) => payment.id === id)
      if (record) setPrintTarget({ kind: 'payment', record })
    }
  }
  return <><section className="module-panel"><div className="module-toolbar"><span>{rows.length} รายการ <small>· {labels[screen]}</small></span><label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหารายการ..." /></label></div><div className="records-table-wrap"><table className="records-table"><thead><tr><th>รหัส / เลขที่</th><th>รายการ</th><th>รายละเอียด</th><th>ยอด / สถานะ</th><th>สถานะ / วันที่</th><th aria-label="การดำเนินการ" /></tr></thead><tbody>{filtered.map((row) => <tr key={row.id}><td><strong>{row.cells[0]}</strong></td><td>{row.cells[1]}</td><td className="detail-cell">{row.cells[2]}</td><td>{row.cells[3]}</td><td><span className={`status-pill ${row.cells[4] === 'PAID' || row.cells[4] === 'CONFIRMED' || row.cells[4] === 'ACTIVE' || row.cells[4] === 'OCCUPIED' ? 'status-good' : row.cells[4] === 'OVERDUE' ? 'status-warn' : 'status-progress'}`}>{getStatus(row.cells[4])}</span><small className="date-cell">{row.cells[5]}</small></td><td><div className="row-actions"><button className="row-action" disabled={row.locked} title={row.locked ? 'แก้ไขไม่ได้ เนื่องจากมีรายการรับชำระแล้ว' : 'แก้ไขข้อมูล'} aria-label={row.locked ? `ล็อกการแก้ไข ${row.cells[0]} มีรายการรับชำระแล้ว` : `แก้ไข ${row.cells[0]}`} onClick={() => onEdit(row.id)}>{row.locked ? <LockKeyhole size={15} /> : <Pencil size={15} />}</button><button className="row-action" disabled={row.cannotDelete} title={row.cannotDelete ? 'ลบไม่ได้ เนื่องจากมีการรับชำระแล้ว' : 'ลบข้อมูล'} aria-label={row.cannotDelete ? `ลบไม่ได้ ${row.cells[0]} มีการรับชำระแล้ว` : `ลบ ${row.cells[0]}`} onClick={() => { if (window.confirm('ยืนยันการลบข้อมูลนี้หรือไม่?\nการลบข้อมูลไม่สามารถย้อนกลับได้')) onDelete(row.id) }}><Trash2 size={15} /></button>{(screen === 'charges' || screen === 'payments') && <button className="row-action print-row-action" title={screen === 'charges' ? 'พิมพ์ใบแจ้งยอดค่าบริการ' : 'พิมพ์ใบเสร็จรับเงิน'} aria-label={`${screen === 'charges' ? 'พิมพ์ใบแจ้งยอดค่าบริการ' : 'พิมพ์ใบเสร็จรับเงิน'} ${row.cells[0]}`} onClick={() => openPrint(row.id)}><Printer size={15} /></button>}</div></td></tr>)}{filtered.length === 0 && <tr><td colSpan={6} className="empty-state">ไม่พบรายการ</td></tr>}</tbody></table></div><div className="table-footer">แสดง {filtered.length} จาก {rows.length} รายการ</div></section>{printTarget && <PrintDocument target={printTarget} store={store} close={() => setPrintTarget(null)} />}</>
}

function PrintDocument({ target, store, close }: { target: PrintTarget; store: Store; close: () => void }) {
  const charge = target.kind === 'charge' ? target.record : store.charges.find((item) => item.id === target.record.charge_id)
  const payment = target.kind === 'payment' ? target.record : undefined
  const house = store.houses.find((item) => item.id === (payment?.house_id ?? charge?.house_id))
  const member = store.members.find((item) => item.id === (payment?.member_id ?? charge?.member_id))
  const project = store.projects.find((item) => item.id === charge?.project_id)
  const documentTitle = payment ? 'ใบเสร็จรับเงิน' : 'ใบแจ้งยอดค่าบริการ'
  const documentNo = payment?.payment_no ?? charge?.charge_no ?? '-'
  const documentDate = payment?.payment_date ?? charge?.issued_at ?? new Date().toISOString().slice(0, 10)
  const documentDateLabel = new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${documentDate}T00:00:00`))
  const dueDateLabel = charge ? new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${charge.due_date}T00:00:00`)) : '-'
  const breakdown = charge ? invoiceBreakdown(store, charge) : undefined
  const allocations = payment ? store.paymentAllocations.filter((item) => item.payment_id === payment.id) : []
  const documentRows = payment
    ? allocations.length > 0
      ? allocations.map((allocation) => {
          const allocatedCharge = store.charges.find((item) => item.id === allocation.charge_id)
          return { id: allocation.id, label: allocatedCharge ? `ชำระบิล ${allocatedCharge.period} · ${allocatedCharge.charge_no}` : 'ชำระค่าส่วนกลาง', amount: allocation.amount }
        })
      : [{ id: payment.id, label: `รับชำระค่าส่วนกลางงวด ${charge?.period ?? '-'}`, amount: payment.amount }]
    : charge
      ? [
          { id: 'current', label: `ค่าส่วนกลางงวด ${charge.period}`, amount: charge.amount },
          ...((charge.water_amount ?? 0) > 0 ? [{ id: 'water', label: charge.water_units === undefined ? 'ค่าน้ำประปา' : `ค่าน้ำประปา ${num(charge.water_units)} หน่วย`, amount: charge.water_amount ?? 0 }] : []),
          ...(breakdown && breakdown.arrears > 0 ? [{ id: 'arrears', label: 'ยอดค้างเดิม', amount: breakdown.arrears }] : []),
          ...(breakdown && breakdown.penalty > 0 ? [{ id: 'penalty', label: 'ค่าปรับค้างชำระ', amount: breakdown.penalty }] : []),
        ]
      : []

  return <div className="print-overlay"><div className="print-toolbar no-print"><button className="secondary-button" onClick={close}>ปิดเอกสาร</button><button className="primary-button" onClick={() => window.print()}><Printer size={16} />พิมพ์เอกสาร</button></div><article className="print-document"><header className="document-header"><div className="document-brand"><span className="document-mark"><Home size={19} /></span><div><strong>{project?.project_name ?? 'โครงการ'}</strong><small>{project?.address ?? ''}</small><small>โทร. {project?.phone ?? '-'}</small></div></div><div className="document-heading"><h1>{documentTitle}</h1><strong>{documentNo}</strong><span>วันที่ {documentDateLabel}</span></div></header><div className="document-rule" /><section className="document-recipient"><div><small>ชื่อลูกบ้าน</small><strong>{person(member)}</strong></div><div><small>บ้านเลขที่ / แปลง</small><strong>{house ? `${house.house_no} / ${house.plot_no}` : '-'}</strong></div><div><small>โทรศัพท์</small><strong>{member?.phone ?? '-'}</strong></div><div><small>รหัสสมาชิก</small><strong>{member?.member_code ?? '-'}</strong></div></section><table className="document-table"><thead><tr><th>รายการ</th><th>จำนวน</th><th>จำนวนเงิน</th></tr></thead><tbody>{documentRows.map((row) => <tr key={row.id}><td>{row.label}</td><td>1 แปลง</td><td>฿ {num(row.amount)}</td></tr>)}</tbody><tfoot><tr><td colSpan={2}>{payment ? 'รับชำระแล้ว' : 'ยอดที่ต้องชำระ'}</td><td>฿ {num(payment?.amount ?? breakdown?.totalDue ?? 0)}</td></tr></tfoot></table>{payment ? <section className="document-payment"><h2>รายละเอียดการรับชำระ</h2><div><span>วันที่รับชำระ</span><strong>{documentDateLabel}</strong></div><div><span>ช่องทางชำระ</span><strong>{payment.payment_method}</strong></div><div><span>บัญชีรับเงิน</span><strong>{payment.bank_account || '-'}</strong></div><div><span>เลขอ้างอิง</span><strong>{payment.reference_no || '-'}</strong></div><div><span>สถานะ</span><strong>{getStatus(payment.status)}</strong></div></section> : <div className="document-due"><div><span>กรุณาชำระภายในวันที่</span><strong>{dueDateLabel}</strong></div><div><span>ยอดที่ต้องชำระ</span><strong>฿ {num(breakdown?.totalDue ?? 0)}</strong></div></div>}<p className="document-note">เอกสารนี้จัดทำจากข้อมูลในระบบบริหารโครงการ {project?.project_code ?? ''}</p><div className="document-signatures"><div><span>{payment ? 'ผู้รับเงิน' : 'ผู้จัดการโครงการ'}</span><i /><small>วันที่ ........../........../..........</small></div>{payment && <div><span>ผู้ชำระเงิน</span><i /><small>วันที่ ........../........../..........</small></div>}</div></article></div>
}

function EntryDialog({ screen, store, editId, close, save }: { screen: ModuleScreen; store: Store; editId: number | null; close: () => void; save: (next: Store) => void }) {
  const [error, setError] = useState('')
  const [form, setForm] = useState<Record<string, string>>(() => {
    const defaults = { project_id: '1', house_id: String(store.houses[0]?.id ?? ''), member_id: String(store.members[0]?.id ?? ''), rate_id: String(store.rates[0]?.id ?? ''), charge_id: String(store.charges.find((charge) => charge.status !== 'PAID')?.id ?? ''), payment_date: new Date().toISOString().slice(0, 10), due_date: '2026-10-31', effective_from: new Date().toISOString().slice(0, 10), period: '10/2026', created_at: new Date().toISOString().slice(0, 10), status: 'ACTIVE', payment_method: 'TRANSFER', bank_account: 'KBANK', amount: String(store.rates[0]?.amount ?? 1500), unit: 'บาท / ตร.ว. / เดือน', land_area: '50', house_area: '150', house_type: 'บ้านเดี่ยว', water_billing_mode: 'fixed', water_fixed_amount: '0', water_unit_rate: '0' }
    if (screen === 'payments' && editId === null) Object.assign(defaults, { house_id: '', member_id: '', charge_id: '', amount: '0' })
    if (editId === null) return defaults
    const source = screen === 'projects' ? store.projects.find((item) => item.id === editId)
      : screen === 'houses' ? store.houses.find((item) => item.id === editId)
        : screen === 'members' ? store.members.find((item) => item.id === editId)
          : screen === 'rates' ? store.rates.find((item) => item.id === editId)
            : screen === 'charges' ? store.charges.find((item) => item.id === editId)
              : screen === 'payments' ? store.payments.find((item) => item.id === editId)
                : (store[screen] as Item[]).find((item) => item.id === editId)
    if (!source) return defaults
    const values = Object.fromEntries(Object.entries(source).map(([key, value]) => [key, String(value ?? '')]))
    if (['repairs', 'assets', 'finance', 'announcements'].includes(screen)) {
      values.name = String((source as Item).title)
      values.created_at = String((source as Item).date)
    }
    if (screen === 'projects') values.project_name = String((source as Project).project_name)
    if (screen === 'members') values.title = String((source as Member).title)
    return { ...defaults, ...values }
  })
  const set = (key: string, value: string) => setForm((previous) => ({ ...previous, [key]: value }))
  const field = (key: string, title: string, type = 'text', required = true, readOnly = false, onValueChange?: (value: string) => void) => <label key={key}>{title}<input type={type} step={type === 'number' ? 'any' : undefined} required={required} readOnly={readOnly} value={form[key] ?? ''} onChange={(event) => onValueChange ? onValueChange(event.target.value) : set(key, event.target.value)} /></label>
  const select = (key: string, title: string, options: [string, string][], onSelect?: (value: string) => void, required = true, disabled = false) => <label key={key}>{title}<select required={required} disabled={disabled} value={form[key] ?? ''} onChange={(event) => onSelect ? onSelect(event.target.value) : set(key, event.target.value)}>{options.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
  const houses = store.houses.map((item) => [String(item.id), `${item.plot_no} · ${item.house_no}`] as [string, string])
  const members = store.members.map((item) => [String(item.id), `${item.title}${item.first_name} ${item.last_name}`] as [string, string])
  const waterBillingMode = form.water_billing_mode as WaterBillingMode
  const selectedBillingProject = store.projects.find((item) => item.id === Number(form.project_id))
  const selectedBillingHouse = store.houses.find((item) => item.id === Number(form.house_id))
  const selectedCommonFeeRate = store.rates.find((item) => item.id === Number(form.rate_id))
  const selectedCommonFeeAmount = selectedBillingHouse && selectedCommonFeeRate ? commonFeeForHouse(selectedCommonFeeRate, selectedBillingHouse) : undefined
  const lastWaterReading = store.charges.filter((charge) => charge.project_id === Number(form.project_id) && charge.house_id === Number(form.house_id) && charge.water_current_reading !== undefined && periodKey(charge.period) < periodKey(form.period)).sort((left, right) => periodKey(right.period) - periodKey(left.period))[0]
  const waterPreviousReading = Number(form.water_previous_reading || lastWaterReading?.water_current_reading || 0)
  const waterCurrentReadingText = form.water_current_reading ?? ''
  const paymentCharges = store.charges.filter((charge) => (charge.member_id === Number(form.member_id) && invoiceBreakdown(store, charge).current > 0) || (editId !== null && charge.id === Number(form.charge_id)))
  const id = () => Date.now()
  function submit(event: React.FormEvent) {
    event.preventDefault()
    const next = structuredClone(store) as Store
    if (editId !== null) {
      if (screen === 'charges' && (next.payments.some((payment) => payment.charge_id === editId) || next.paymentAllocations.some((allocation) => allocation.charge_id === editId))) {
        setError('แก้ไขไม่ได้ เนื่องจากใบเรียกเก็บนี้มีรายการรับชำระแล้ว')
        return
      }
      if (screen === 'projects') next.projects = next.projects.map((item) => item.id === editId ? { ...item, project_code: form.project_code, project_name: form.project_name, address: form.address, phone: form.phone, status: form.status, created_at: form.created_at, water_billing_mode: waterBillingMode, water_fixed_amount: Number(form.water_fixed_amount || 0), water_unit_rate: Number(form.water_unit_rate || 0) } : item)
      else if (screen === 'houses') next.houses = next.houses.map((item) => item.id === editId ? { ...item, project_id: Number(form.project_id), house_code: form.house_code, house_no: form.house_no, plot_no: form.plot_no, house_type: form.house_type, land_area: Number(form.land_area), house_area: Number(form.house_area), status: form.status } : item)
      else if (screen === 'members') next.members = next.members.map((item) => item.id === editId ? { ...item, member_code: form.member_code, title: form.title, first_name: form.first_name, last_name: form.last_name, phone: form.phone, line_id: form.line_id, email: form.email, status: form.status, house_id: Number(form.house_id) || undefined } : item)
      else if (screen === 'rates') next.rates = next.rates.map((item) => item.id === editId ? { ...item, project_id: Number(form.project_id), amount: Number(form.amount), unit: form.unit, effective_from: form.effective_from, status: form.status } : item)
      else if (screen === 'charges') {
        const project = next.projects.find((item) => item.id === Number(form.project_id))
        const currentReading = Number(waterCurrentReadingText)
        if (project?.water_billing_mode === 'metered' && (!waterCurrentReadingText || waterPreviousReading < 0 || currentReading < waterPreviousReading)) {
          setError('กรุณากรอกเลขมิเตอร์ปัจจุบัน และต้องไม่น้อยกว่าเลขครั้งก่อน')
          return
        }
        const waterUnits = project?.water_billing_mode === 'metered' ? currentReading - waterPreviousReading : 0
        const waterAmount = project?.water_billing_mode === 'metered' ? waterUnits * (project.water_unit_rate ?? 0) : project?.water_fixed_amount ?? 0
        const house = next.houses.find((item) => item.id === Number(form.house_id))
        const rate = next.rates.find((item) => item.id === Number(form.rate_id))
        next.charges = next.charges.map((item) => item.id === editId ? { ...item, project_id: Number(form.project_id), rate_id: Number(form.rate_id), house_id: Number(form.house_id), member_id: Number(form.member_id), period: form.period, amount: rate && house ? commonFeeForHouse(rate, house) : item.amount, water_amount: waterAmount, ...(project?.water_billing_mode === 'metered' ? { water_previous_reading: waterPreviousReading, water_current_reading: currentReading, water_units: waterUnits } : { water_previous_reading: undefined, water_current_reading: undefined, water_units: undefined }), due_date: form.due_date, status: form.status } : item)
      }
      else if (screen === 'payments') next.payments = next.payments.map((item) => item.id === editId ? { ...item, payment_date: form.payment_date, payment_method: form.payment_method, bank_account: form.bank_account, reference_no: form.reference_no } : item)
      else {
        const list = next[screen] as Item[]
        const index = list.findIndex((item) => item.id === editId)
        if (index >= 0) list[index] = { ...list[index], title: form.name, detail: form.detail, date: form.created_at, ...(screen === 'finance' ? { amount: Number(form.amount) } : {}) }
      }
      save(next)
      return
    }
    if (screen === 'projects') next.projects.unshift({ id: id(), project_code: form.project_code, project_name: form.project_name, address: form.address, phone: form.phone, status: form.status, created_at: form.created_at, water_billing_mode: waterBillingMode, water_fixed_amount: Number(form.water_fixed_amount || 0), water_unit_rate: Number(form.water_unit_rate || 0) })
    else if (screen === 'houses') next.houses.unshift({ id: id(), project_id: Number(form.project_id), house_code: form.house_code, house_no: form.house_no, plot_no: form.plot_no, house_type: form.house_type, land_area: Number(form.land_area), house_area: Number(form.house_area), status: form.status })
    else if (screen === 'members') next.members.unshift({ id: id(), member_code: form.member_code, title: form.title, first_name: form.first_name, last_name: form.last_name, phone: form.phone, line_id: form.line_id, email: form.email, status: form.status, house_id: Number(form.house_id) || undefined })
    else if (screen === 'rates') next.rates.unshift({ id: id(), project_id: Number(form.project_id), amount: Number(form.amount), unit: form.unit, effective_from: form.effective_from, status: form.status })
    else if (screen === 'charges') {
      const rate = next.rates.find((item) => item.id === Number(form.rate_id))
      const house = next.houses.find((item) => item.id === Number(form.house_id))
      const project = next.projects.find((item) => item.id === Number(form.project_id))
      const currentReading = Number(waterCurrentReadingText)
      if (project?.water_billing_mode === 'metered' && (!waterCurrentReadingText || waterPreviousReading < 0 || currentReading < waterPreviousReading)) {
        setError('กรุณากรอกเลขมิเตอร์ปัจจุบัน และต้องไม่น้อยกว่าเลขครั้งก่อน')
        return
      }
      const waterUnits = project?.water_billing_mode === 'metered' ? currentReading - waterPreviousReading : 0
      const waterAmount = project?.water_billing_mode === 'metered' ? waterUnits * (project.water_unit_rate ?? 0) : project?.water_fixed_amount ?? 0
      const charge: Charge = { id: id(), charge_no: `INV${String(new Date().getFullYear() + 543).slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(next.charges.length + 1).padStart(4, '0')}`, project_id: Number(form.project_id), rate_id: Number(form.rate_id), house_id: Number(form.house_id), member_id: Number(form.member_id), period: form.period, amount: rate && house ? commonFeeForHouse(rate, house) : 0, water_amount: waterAmount, ...(project?.water_billing_mode === 'metered' ? { water_previous_reading: waterPreviousReading, water_current_reading: currentReading, water_units: waterUnits } : {}), issued_at: new Date().toISOString().slice(0, 10), due_date: form.due_date, status: 'UNPAID' }
      charge.penalty_amount = invoiceBreakdown(next, charge).penalty
      next.charges.unshift(charge)
    }
    else if (screen === 'payments') { const chargeId = Number(form.charge_id); const charge = next.charges.find((item) => item.id === chargeId); if (!charge) { setError('ไม่พบใบแจ้งหนี้ที่เลือก'); return } const breakdown = invoiceBreakdown(next, charge); charge.penalty_amount = breakdown.penalty; const outstandingBalance = chargeBalance(next, charge); const amount = Number(form.amount || outstandingBalance); if (outstandingBalance <= 0 || amount <= 0 || amount > outstandingBalance) { setError('ใบแจ้งหนี้นี้ไม่มียอดคงเหลือ หรือยอดรับชำระเกินยอดคงเหลือ'); return } const paymentId = id(); const unallocated = allocatePayment(next, paymentId, amount, charge); if (unallocated > 0.009) { setError('ไม่สามารถจัดสรรยอดรับชำระได้ครบ'); return } next.payments.unshift({ id: paymentId, payment_no: `RC${String(new Date().getFullYear() + 543).slice(-2)}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(next.payments.length + 1).padStart(4, '0')}`, payment_date: form.payment_date, member_id: Number(form.member_id), house_id: Number(form.house_id), charge_id: chargeId, amount, payment_method: form.payment_method, bank_account: form.bank_account, reference_no: form.reference_no, status: 'CONFIRMED' }) }
    else { const list = next[screen] as Item[]; list.unshift({ id: id(), title: form.name, detail: form.detail, status: screen === 'repairs' ? 'รับเรื่องแล้ว' : screen === 'announcements' ? 'ร่าง' : 'รายการใหม่', date: form.created_at, ...(form.amount ? { amount: Number(form.amount) } : {}) }) }
    save(next)
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}><section className="record-modal" role="dialog" aria-modal="true"><div className="modal-heading"><div><p className="eyebrow">{labels[screen]}</p><h2>{editId === null ? actionText[screen] : `แก้ไข${labels[screen]}`}</h2></div><button className="icon-button" onClick={close} aria-label="ปิด"><X size={19} /></button></div><form onSubmit={submit}>{screen === 'charges' && selectedBillingHouse && selectedCommonFeeRate && <p className="form-hint">ค่าส่วนกลางที่คำนวณแล้ว: ฿ {num(selectedCommonFeeAmount ?? 0)} ({num(selectedBillingHouse.land_area)} ตร.ว. × ฿ {num(selectedCommonFeeRate.amount)} / ตร.ว.)</p>}
    {screen === 'projects' && <>{field('project_code', 'รหัสโครงการ')}{field('project_name', 'ชื่อโครงการ')}{field('address', 'ที่อยู่')}{field('phone', 'โทรศัพท์', 'tel')}{select('water_billing_mode', 'รูปแบบคิดค่าน้ำ', [['fixed', 'อัตราคงที่ต่อรอบ'], ['metered', 'คิดตามหน่วยมิเตอร์']])}{waterBillingMode === 'fixed' ? field('water_fixed_amount', 'ค่าน้ำต่อรอบ (บาท)', 'number') : field('water_unit_rate', 'อัตราค่าน้ำ (บาท / หน่วย)', 'number')}{select('status', 'สถานะ', [['ACTIVE', 'ใช้งาน'], ['INACTIVE', 'ปิดใช้งาน']])}{field('created_at', 'วันที่สร้าง', 'date')}</>}
    {screen === 'houses' && <>{select('project_id', 'โครงการ', store.projects.map((item) => [String(item.id), item.project_name]))}{field('house_code', 'รหัสบ้าน')}{field('house_no', 'บ้านเลขที่')}{field('plot_no', 'เลขที่แปลง')}{select('house_type', 'ประเภทบ้าน', [['บ้านเดี่ยว', 'บ้านเดี่ยว'], ['บ้านแฝด', 'บ้านแฝด'], ['ทาวน์โฮม', 'ทาวน์โฮม']])}{field('land_area', 'พื้นที่ดิน (ตร.ว.)', 'number')}{field('house_area', 'พื้นที่บ้าน (ตร.ม.)', 'number')}{select('status', 'สถานะ', [['OCCUPIED', 'มีผู้อยู่อาศัย'], ['VACANT', 'ว่าง']])}</>}
    {screen === 'members' && <>{field('member_code', 'รหัสสมาชิก')}{select('title', 'คำนำหน้า', [['คุณ', 'คุณ'], ['นาย', 'นาย'], ['นาง', 'นาง'], ['นางสาว', 'นางสาว']])}{field('first_name', 'ชื่อ')}{field('last_name', 'นามสกุล')}{field('phone', 'โทรศัพท์', 'tel')}{field('line_id', 'LINE ID', 'text', false)}{field('email', 'Email', 'email', false)}{select('house_id', 'บ้านที่เชื่อมโยง', [['', 'ไม่ระบุบ้าน'], ...houses], undefined, false)}{select('status', 'สถานะ', [['ACTIVE', 'ใช้งาน'], ['INACTIVE', 'ไม่ใช้งาน']])}</>}
    {screen === 'rates' && <>{select('project_id', 'โครงการ', store.projects.map((item) => [String(item.id), item.project_name]))}{field('amount', 'อัตรา (บาท)', 'number')}{field('unit', 'หน่วยเรียกเก็บ')}{field('effective_from', 'วันที่เริ่มใช้', 'date')}{select('status', 'สถานะ', [['ACTIVE', 'ใช้งาน'], ['INACTIVE', 'ยกเลิก']])}</>}
    {screen === 'charges' && <>{select('project_id', 'โครงการ', store.projects.map((item) => [String(item.id), item.project_name]), (value) => setForm((previous) => ({ ...previous, project_id: value, water_previous_reading: '', water_current_reading: '' })))}{select('house_id', 'บ้าน / แปลง', houses, (value) => { const previous = store.charges.filter((charge) => charge.project_id === Number(form.project_id) && charge.house_id === Number(value) && charge.water_current_reading !== undefined && periodKey(charge.period) < periodKey(form.period)).sort((left, right) => periodKey(right.period) - periodKey(left.period))[0]; setForm((state) => ({ ...state, house_id: value, water_previous_reading: String(previous?.water_current_reading ?? 0), water_current_reading: '' })) })}{select('member_id', 'ลูกบ้าน', members)}{select('rate_id', 'อัตราค่าส่วนกลาง', store.rates.map((item) => [String(item.id), `฿ ${num(item.amount)} ${item.unit}`]))}{field('period', 'รอบเรียกเก็บ (ดด/ปปปป)', 'text', true, false, (value) => setForm((previous) => ({ ...previous, period: value, water_previous_reading: '', water_current_reading: '' })))}{selectedBillingProject?.water_billing_mode === 'metered' && <>{field('water_previous_reading', 'เลขมิเตอร์ครั้งก่อน', 'number')}{field('water_current_reading', 'เลขมิเตอร์ครั้งนี้', 'number')}</>}{selectedBillingProject?.water_billing_mode === 'fixed' && <p className="form-hint">ค่าน้ำอัตราคงที่ ฿ {num(selectedBillingProject.water_fixed_amount ?? 0)} ต่อรอบ</p>}{field('due_date', 'วันครบกำหนด', 'date')}{select('status', 'สถานะ', [['UNPAID', 'รอชำระ'], ['OVERDUE', 'เกินกำหนด'], ['PAID', 'ชำระแล้ว']])}<p className="form-hint">ระบบสร้างเลขใบแจ้งหนี้และดึงอัตราจากข้อมูลโครงการ</p></>}
    {screen === 'payments' && <>{select('member_id', 'ลูกบ้าน', [['', 'เลือกลูกบ้าน'], ...members], (value) => { const member = store.members.find((item) => item.id === Number(value)); setForm((previous) => ({ ...previous, member_id: value, house_id: String(member?.house_id ?? ''), charge_id: '', amount: '0' })) }, true, editId !== null)}{select('charge_id', 'ใบแจ้งหนี้', [['', form.member_id ? 'เลือกใบแจ้งหนี้' : 'เลือกลูกบ้านก่อน'], ...paymentCharges.map((item) => [String(item.id), `${item.charge_no} · คงเหลือ ฿${num(invoiceBreakdown(store, item).current)} · ${getStatus(item.status)}`] as [string, string])], (value) => { const charge = store.charges.find((item) => item.id === Number(value)); setForm((previous) => ({ ...previous, charge_id: value, house_id: String(charge?.house_id ?? ''), member_id: String(charge?.member_id ?? previous.member_id), amount: String(charge ? invoiceBreakdown(store, charge).current : 0) })) }, true, editId !== null || !form.member_id)}{select('house_id', 'บ้าน / แปลง', houses, undefined, true, true)}{field('payment_date', 'วันที่รับชำระ', 'date')}{field('amount', 'จำนวนเงิน (บาท)', 'number', true, true)}{select('payment_method', 'ช่องทางชำระ', [['TRANSFER', 'โอนเงิน'], ['CASH', 'เงินสด'], ['PROMPTPAY', 'พร้อมเพย์'], ['CHEQUE', 'เช็ค']])}{select('bank_account', 'บัญชีธนาคาร', [['KBANK', 'กสิกรไทย (KBANK)'], ['SCB', 'ไทยพาณิชย์ (SCB)'], ['BBL', 'กรุงเทพ (BBL)'], ['CASH', 'เงินสด / อื่น ๆ']])}{field('reference_no', 'เลขอ้างอิง', 'text', false)}<p className="form-hint">เลือกลูกบ้านและใบแจ้งหนี้ก่อน ระบบจะตัดยอดเข้าบิลที่เลือก</p></>}
    {!['projects', 'houses', 'members', 'rates', 'charges', 'payments'].includes(screen) && <>{field('name', screen === 'repairs' ? 'หัวข้องานซ่อม' : screen === 'assets' ? 'ชื่อทรัพย์สิน' : screen === 'finance' ? 'ชื่อรายการบัญชี' : 'หัวข้อประกาศ')}{field('detail', 'รายละเอียด', 'text', false)}{screen === 'finance' && field('amount', 'จำนวนเงิน', 'number')}{field('created_at', 'วันที่', editId === null ? 'date' : 'text')}</>}
    {error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={close}>ยกเลิก</button><button className="primary-button" type="submit"><Check size={16} />{editId === null ? 'บันทึกรายการ' : 'บันทึกการแก้ไข'}</button></div></form></section></div>
}

export default App
