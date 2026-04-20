// Translation dictionary for checkout & pay pages

export type Lang = "th" | "en";

export const t = {
    // Header
    langLabel: { th: "TH", en: "EN" },

    // Form Section
    payment: { th: "ชำระเงิน", en: "Payment" },
    fullName: { th: "ชื่อ - นามสกุล", en: "Full Name" },
    postalCode: { th: "รหัสไปรษณีย์", en: "Postal Code" },
    postalCodePlaceholder: { th: "เช่น 10100", en: "e.g. 10100" },
    province: { th: "จังหวัด", en: "Province" },
    district: { th: "อำเภอ/เขต", en: "District" },
    subdistrict: { th: "ตำบล/แขวง", en: "Sub-district" },
    address: { th: "ที่อยู่", en: "Address" },
    addressPlaceholder: { th: "บ้านเลขที่, หมู่, ซอย, และถนน", en: "House No., Moo, Soi, Road" },
    phone: { th: "เบอร์โทรศัพท์ ( เช. 0999999999 )", en: "Phone ( e.g. 0999999999 )" },
    email: { th: "อีเมล", en: "Email" },
    emailPlaceholder: { th: "example@email.com", en: "example@email.com" },
    wantTaxInvoice: { th: "ต้องการใบกำกับภาษี / ใบแจ้ง", en: "Request Tax Invoice" },
    taxTitle: { th: "ข้อมูลในการออกใบเสร็จ / ใบกำกับภาษี", en: "Tax Invoice Details" },
    taxName: { th: "ชื่อ", en: "Name" },
    taxAddress: { th: "ที่อยู่", en: "Address" },
    taxId: { th: "หมายเลขประจำตัวผู้เสียภาษี หรือหมายเลขบัตรประชาชน", en: "Tax ID / ID Card" },
    receiptPreview: { th: "ตัวอย่างลายเซ็นในใบเสร็จ", en: "Receipt Signature Preview" },
    authorizedSigner: { th: "ผู้มีอำนาจลงนาม", en: "Authorized Signer" },

    // Shipping
    shippingTitle: { th: "ตัวเลือกในการจัดส่ง", en: "Shipping Options" },
    free: { th: "ฟรี", en: "Free" },
    shipping: { th: "การจัดส่ง", en: "Shipping" },

    // Payment Details
    paymentDetails: { th: "รายละเอียดการชำระเงิน", en: "Payment Details" },
    viewCart: { th: "คลิกเพื่อดูสินค้าในตะกร้าของคุณ", en: "Click to view items in your cart" },
    emptyCart: { th: "ไม่มีสินค้าในตะกร้า", en: "No items in cart" },
    price: { th: "ราคา", en: "Price" },
    discount: { th: "ส่วนลด", en: "Discount" },
    shippingCost: { th: "ค่าขนส่ง", en: "Shipping" },
    freeShipping: { th: "ฟรี", en: "Free" },
    freeByCode: { th: "ฟรี (โค้ดส่วนลด)", en: "Free (Discount Code)" },
    total: { th: "ยอดรวมทั้งหมด", en: "Total" },
    discountCode: { th: "ใส่โค้ดส่วนลด", en: "Enter discount code" },
    applyCode: { th: "ใช้โค้ด", en: "Apply" },
    hasDiscountCode: { th: "มีโค้ดส่วนลด", en: "Have a discount code?" },
    note: { th: "หมายเหตุ", en: "Notes" },

    // Bank Transfer
    bankTransfer: { th: "🏦 โอนเงิน", en: "🏦 Bank Transfer" },
    bankTransferChannelLine1: { th: "ช่องทาง", en: "Bank Transfer" },
    bankTransferChannelLine2: { th: "การโอนเงิน", en: "Channel" },
    bankPrefix: { th: "ธนาคาร", en: "Bank" },
    accountName: { th: "ชื่อบัญชี", en: "Account Name" },
    copyBtn: { th: "คัดลอก", en: "Copy" },
    transferInstructions: { th: "หากโอนเงินแล้ว รบกวนส่งสลิปโอนเงิน พร้อมชื่อ ที่อยู่\nและเบอร์โทร ด้วยนะครับ", en: "After transfer, please send the payment slip with your name, address and phone number." },
    transferDeadline: { th: "กรุณาโอนเงินภายใน 3 วัน ด้วยข้อมูลที่ถูกต้องครับ", en: "Please transfer within 3 days with correct information." },

    // PromptPay
    promptPay: { th: "💳 พร้อมเพย์ (PromptPay)", en: "💳 PromptPay" },
    scanQR: { th: "สแกน QR Code เพื่อชำระเงินผ่านพร้อมเพย์", en: "Scan QR Code to pay via PromptPay" },

    // COD
    cod: { th: "💵 เก็บเงินปลายทาง (COD)", en: "💵 Cash on Delivery (COD)" },
    codDesc: { th: "ชำระเงินเมื่อได้รับสินค้า", en: "Pay when you receive the item" },

    // Upload Slip
    slipTitle: { th: "ใบเสร็จโอนเงิน", en: "Payment Receipt" },
    attachSlip: { th: "📎 แนบหลักฐานการชำระเงิน", en: "📎 Attach Payment Proof" },
    fileSize: { th: "อัพโหลดไฟล์ขนาด: 5MB", en: "Max file size: 5MB" },
    fileSizeLg: { th: "อัพโหลดไฟล์ขนาด: 20MB", en: "Max file size: 20MB" },
    slipRequired: { th: "⚠️ กรุณาแนบใบเสร็จโอนเงิน", en: "⚠️ Please attach payment receipt" },

    // Terms & Submit
    termsPrefix: { th: 'เมื่อคลิก "ดำเนินการชำระเงิน" อ่านรายละเอียด', en: 'By clicking "Submit Payment", you agree to the' },
    termsLink: { th: "เงื่อนไขและนโยบายการคืนเงิน", en: "Terms & Refund Policy" },
    submitBtn: { th: "ดำเนินการชำระสินค้า", en: "Submit Payment" },
    submitting: { th: "กำลังส่ง...", en: "Processing..." },

    // Pay Page Specific
    waitingPayment: { th: "⏳ รอชำระเงิน", en: "⏳ Pending" },
    paidStatus: { th: "✅ ชำระแล้ว", en: "✅ Paid" },
    customerName: { th: "ชื่อลูกค้า", en: "Customer Name" },
    orderLabel: { th: "ออเดอร์", en: "Order" },

    // Success
    successTitle: { th: "ชำระเงินเรียบร้อย! 🎉", en: "Payment Successful! 🎉" },
    successMsg: { th: "ขอบคุณที่สั่งซื้อ เราจะจัดส่งสินค้าให้เร็วที่สุดครับ 🙏", en: "Thank you for your order! We will ship it as soon as possible 🙏" },
    successCheckout: { th: "ส่งข้อมูลเรียบร้อย! 🎉", en: "Order Submitted! 🎉" },
    successCheckoutMsg: { th: "แอดมินจะตรวจสอบและยืนยันออเดอร์ผ่าน Messenger\nขอบคุณที่ไว้วางใจนะครับ 🙏", en: "Admin will review and confirm your order via Messenger.\nThank you for trusting us 🙏" },
    backToShop: { th: "กลับหน้าร้าน", en: "Back to Shop" },

    // Loading/Error
    loading: { th: "กำลังโหลดข้อมูล...", en: "Loading..." },
    orderNotFound: { th: "ไม่พบคำสั่งซื้อ", en: "Order Not Found" },

    // No payment methods
    noPayment: { th: "ยังไม่ได้เปิดช่องทางชำระเงิน กรุณาติดต่อแอดมิน", en: "No payment methods available. Please contact admin." },

    // Postal code autocomplete
    postalLoading: { th: "กำลังโหลด...", en: "Loading..." },
    postalNotFound: { th: "ไม่พบข้อมูล", en: "No data found" },

    // Select file
    selectFile: { th: "แตะเพื่อเลือกรูปสลิป", en: "Tap to select slip image" },
    supportedFormats: { th: "รองรับ JPG, PNG (สูงสุด 5MB)", en: "JPG, PNG supported (max 5MB)" },
};
