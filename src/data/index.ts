import { Product, Category } from "@/types";

export const categories: Category[] = [
    { id: "all", name: "ทั้งหมด", nameEn: "All" },
    { id: "sale", name: "ลดราคา", nameEn: "Sale" },
    { id: "camera-sony", name: "CAMERA SONY", nameEn: "Camera Sony" },
    { id: "lens-sony", name: "LENS SONY", nameEn: "Lens Sony" },
    { id: "flash-sony", name: "FLASH SONY", nameEn: "Flash Sony" },
    { id: "camera-nikon", name: "CAMERA NIKON", nameEn: "Camera Nikon" },
    { id: "lens-nikon", name: "LENS NIKON", nameEn: "Lens Nikon" },
    { id: "camera-canon", name: "CAMERA CANON", nameEn: "Camera Canon" },
    { id: "lens-canon", name: "LENS CANON", nameEn: "Lens Canon" },
    { id: "adapter-canon", name: "ADAPTER CANON", nameEn: "Adapter Canon" },
    { id: "camera-panasonic", name: "CAMERA PANASONIC", nameEn: "Camera Panasonic" },
    { id: "lens-sigma", name: "LENS SIGMA", nameEn: "Lens Sigma" },
];

const S3 = "https://zwizai.s3.amazonaws.com/ecommerce/";

// Shared variant options across all products (76 texture/skin variants with thumbnail images)
const V = S3; // shorthand for variant image base
const sharedVariants = [
    { id: "CDBK", name: "CDBK", stock: 99, image: V + "1712101698871114336388182180_1712101699" },
    { id: "LTBK", name: "LTBK", stock: 99, image: V + "1712101811071114336388182180_1712101811" },
    { id: "SDBK", name: "SDBK", stock: 99, image: V + "1712101834048114336388182180_1712101834" },
    { id: "MTBK", name: "MTBK", stock: 99, image: V + "1712101843537114336388182180_1712101843" },
    { id: "MBGY", name: "MBGY", stock: 99, image: V + "1712101853652114336388182180_1712101854" },
    { id: "MBBK", name: "MBBK", stock: 99, image: V + "1712101863543114336388182180_1712101863" },
    { id: "MBSN", name: "MBSN", stock: 99, image: V + "1712101885374114336388182180_1712101885" },
    { id: "NDWT", name: "NDWT", stock: 99, image: V + "1712101907675114336388182180_1712101908" },
    { id: "NDBK", name: "NDBK", stock: 99, image: V + "1712101916179114336388182180_1712101916" },
    { id: "WABK", name: "WABK", stock: 99, image: V + "1712101925864114336388182180_1712101926" },
    { id: "WAWT", name: "WAWT", stock: 99, image: V + "1712101931981114336388182180_1712101932" },
    { id: "WAGD", name: "WAGD", stock: 99, image: V + "1712101955718114336388182180_1712101956" },
    { id: "GFWT", name: "GFWT", stock: 99, image: V + "1712101968417114336388182180_1712101968" },
    { id: "GFYL", name: "GFYL", stock: 99, image: V + "1712101977570114336388182180_1712101977" },
    { id: "WASV", name: "WASV", stock: 99, image: V + "1712102009961114336388182180_1712102010" },
    { id: "CMG", name: "CMG", stock: 99, image: V + "1712102033063114336388182180_1712102033" },
    { id: "CMD", name: "CMD", stock: 99, image: V + "1712102038979114336388182180_1712102039" },
    { id: "CMW", name: "CMW", stock: 99, image: V + "1712102055809114336388182180_1712102056" },
    { id: "CMSV", name: "CMSV", stock: 99, image: V + "1712102071186114336388182180_1712102071" },
    { id: "ELTB", name: "ELTB", stock: 99, image: V + "1712102083040114336388182180_1712102083" },
    { id: "ELTW", name: "ELTW", stock: 99, image: V + "1712102091552114336388182180_1712102091" },
    { id: "MASV", name: "MASV", stock: 99, image: V + "1712102098544114336388182180_1712102098" },
    { id: "MAWT", name: "MAWT", stock: 99, image: V + "1712102104745114336388182180_1712102105" },
    { id: "MABK", name: "MABK", stock: 99, image: V + "1712102113821114336388182180_1712102114" },
    { id: "CTUB", name: "CTUB", stock: 99, image: V + "1712102132050114336388182180_1712102132" },
    { id: "CTBK", name: "CTBK", stock: 99, image: V + "1712102144964114336388182180_1712102145" },
    { id: "CTWT", name: "CTWT", stock: 99, image: V + "1712102154073114336388182180_1712102154" },
    { id: "CMF", name: "CMF", stock: 99, image: V + "1712102164720114336388182180_1712102165" },
    { id: "GFGP", name: "GFGP", stock: 99, image: V + "1712102179538114336388182180_1712102179" },
    { id: "CMRG", name: "CMRG", stock: 99, image: V + "1712102194892114336388182180_1712102195" },
    { id: "CMOB", name: "CMOB", stock: 99, image: V + "1712102208318114336388182180_1712102208" },
    { id: "CMGB", name: "CMGB", stock: 99, image: V + "1712102216890114336388182180_1712102217" },
    { id: "ASB", name: "ASB", stock: 99, image: V + "1712102228191114336388182180_1712102228" },
    { id: "AGBK", name: "AGBK", stock: 99, image: V + "1712102239043114336388182180_1712102239" },
    { id: "GFG", name: "GFG", stock: 99, image: V + "1712102258544114336388182180_1712102258" },
    { id: "GFR", name: "GFR", stock: 99, image: V + "1712102266049114336388182180_1712102266" },
    { id: "BTSC", name: "BTSC", stock: 99, image: V + "1712102276518114336388182180_1712102276" },
    { id: "CSTT", name: "CSTT", stock: 99, image: V + "1712102289489114336388182180_1712102289" },
    { id: "SY", name: "SY", stock: 99, image: V + "1712102300653114336388182180_1712102300" },
    { id: "JPW", name: "JPW", stock: 99, image: V + "1712102329400114336388182180_1712102329" },
    { id: "BTSY", name: "BTSY", stock: 99, image: V + "1712102348636114336388182180_1712102348" },
    { id: "CCW", name: "CCW", stock: 99, image: V + "1712102362332114336388182180_1712102362" },
    { id: "SLPW", name: "SLPW", stock: 99, image: V + "1712102389570114336388182180_1712102389" },
    { id: "SLPB", name: "SLPB", stock: 99, image: V + "1712102403537114336388182180_1712102403" },
    { id: "XCWT", name: "XCWT", stock: 99, image: V + "1712102413701114336388182180_1712102414" },
    { id: "XCUB", name: "XCUB", stock: 99, image: V + "1712102423349114336388182180_1712102423" },
    { id: "XCGY", name: "XCGY", stock: 99, image: V + "1712102438988114336388182180_1712102439" },
    { id: "BSQ", name: "BSQ", stock: 99, image: V + "1712102464396114336388182180_1712102464" },
    { id: "WSQ", name: "WSQ", stock: 99, image: V + "1712102489520114336388182180_1712102489" },
    { id: "SVSQ", name: "SVSQ", stock: 99, image: V + "1712102500575114336388182180_1712102500" },
    { id: "CMM", name: "CMM", stock: 99, image: V + "1712102518075114336388182180_1712102518" },
    { id: "CDOP", name: "CDOP", stock: 99, image: V + "1712102531549114336388182180_1712102531" },
    { id: "CUSTOMER", name: "CUSTOMER", stock: 99, image: V + "1712102557715114336388182180_1712102558" },
    { id: "SPD1", name: "SPD1", stock: 99, image: V + "1712102578211114336388182180_1712102578" },
    { id: "SPD2", name: "SPD2", stock: 99, image: V + "1712102588579114336388182180_1712102588" },
    { id: "SPD3", name: "SPD3", stock: 99, image: V + "1712102600758114336388182180_1712102601" },
    { id: "SPD4", name: "SPD4", stock: 99, image: V + "1712102609764114336388182180_1712102610" },
    { id: "SPD5", name: "SPD5", stock: 99, image: V + "1712102617609114336388182180_1712102617" },
    { id: "SPD6", name: "SPD6", stock: 99, image: V + "1712102632134114336388182180_1712102632" },
    { id: "SPD7", name: "SPD7", stock: 99, image: V + "1712102641944114336388182180_1712102642" },
    { id: "SPD8", name: "SPD8", stock: 99, image: V + "1712102651678114336388182180_1712102651" },
    { id: "LG1", name: "LG1", stock: 99, image: V + "1712102680868114336388182180_1712102681" },
    { id: "SLPGB", name: "SLPGB", stock: 99, image: V + "1712103030954114336388182180_1712103031" },
    { id: "SLPG", name: "SLPG", stock: 99, image: V + "1712102706749114336388182180_1712102707" },
    { id: "SLPBK", name: "SLPBK", stock: 99, image: V + "1712102718480114336388182180_1712102718" },
    { id: "SLPBK1", name: "SLPBK1", stock: 99, image: V + "1712102731507114336388182180_1712102731" },
    { id: "NDR", name: "NDR", stock: 99, image: V + "1712102742545114336388182180_1712102742" },
    { id: "SS", name: "SS", stock: 99, image: V + "1712102751987114336388182180_1712102752" },
    { id: "ANM", name: "ANM", stock: 99, image: V + "1712102782378114336388182180_1712102782" },
    { id: "SSBK", name: "SSBK", stock: 99, image: V + "1712102791309114336388182180_1712102791" },
    { id: "SBK", name: "SBK", stock: 99, image: V + "1712102801903114336388182180_1712102802" },
    { id: "AGBO", name: "AGBO", stock: 99, image: V + "1712102815976114336388182180_1712102816" },
    { id: "LTWT", name: "LTWT", stock: 99, image: V + "1712102825141114336388182180_1712102825" },
    { id: "LTBK1", name: "LTBK1", stock: 99, image: V + "1712102839247114336388182180_1712102839" },
    { id: "WBK", name: "WBK", stock: 99, image: V + "1712102856478114336388182180_1712102856" },
    { id: "TCFR", name: "TCFR", stock: 99, image: V + "1712102870395114336388182180_1712102870" },
];

const productDescription = `Camera protective film Stickers
📌2 ส่วน
📌ชิ้นส่วนยาง (ยึดกับ Matrix Black)
📌อะไหล่อื่นๆ (มีให้เลือกหลายสไตล์ตาม SKU ของลิงค์)

รายละเอียดสินค้า
📌วัสดุคุณภาพสูงจากแบรนด์ 3M
📌กันน้ำ, กันน้ำมัน, ป้องกันรอยขีดข่วน, การป้องกันรอบด้าน
📌ไม่ทิ้งกาว ลอกออกง่าย ไม่เป็นอันตรายต่อกล้อง/เลนส์หรืออุปกรณ์อื่นๆ
📌1:1 โมเดลจริง 3D การวางตำแหน่งการสแกนหลายมิติ/การตัดด้วยความแม่นยำด้วยเลเซอร์
📌ปกป้องแต่ละส่วนของอุปกรณ์ของคุณ

คำแนะนำในการติด
📌กรุณาทำความสะอาดพื้นผิวอุปกรณ์ให้สะอาด
📌ขจัดฝุ่นทั้งหมดโดยใช้เทปกาว
📌ดูวิดีโอแนะนำหรือคู่มืออย่างละเอียด
📌ใช้เครื่องเป่าลมร้อนเพื่อช่วยให้ติด
📌อย่าดึงแรง
📌หากมีข้อสงสัยกรุณาส่งข้อความ

พัสดุรวม
📌1x Sticker Skin
📌1x แหนบ (สำหรับรายการสั่งซื้อ 890 บาท ขึ้นไป)
📌1x ผ้าเช็ดทำความสะอาด
📌1x คู่มือ`;

function makeVariants(price: number) {
    return sharedVariants.map((v) => ({
        ...v,
        price,
    }));
}

export const products: Product[] = [
    {
        id: "sony-a7c",
        name: "SONY A7C",
        description: productDescription,
        price: 790,
        images: [
            S3 + "1712103502814a7c.png",
        ],
        categoryId: "camera-sony",
        variants: makeVariants(790),
        badge: undefined,
    },
    {
        id: "sony-a7iii",
        name: "SONY A7III/A7RIII",
        description: productDescription,
        price: 890,
        images: [
            S3 + "1712103588773a7iii.png",
        ],
        categoryId: "camera-sony",
        variants: makeVariants(890),
        badge: undefined,
    },
    {
        id: "canon-6d",
        name: "Canon 6D",
        description: productDescription,
        price: 890,
        images: [
            S3 + "17121033150026d.png",
        ],
        categoryId: "camera-canon",
        variants: makeVariants(890),
        badge: undefined,
    },
    {
        id: "canon-1dxiii",
        name: "Canon 1DXiii_copy",
        description: productDescription,
        price: 1090,
        images: [
            S3 + "17121012368381dx3.png",
        ],
        categoryId: "camera-canon",
        variants: makeVariants(1090),
        badge: undefined,
    },
    {
        id: "canon-5div",
        name: "Canon 5DIV",
        description: productDescription,
        price: 890,
        images: [
            S3 + "17121031652565div.png",
        ],
        categoryId: "camera-canon",
        variants: makeVariants(890),
        badge: undefined,
    },
];

export const shopConfig = {
    shopName: process.env.NEXT_PUBLIC_SHOP_NAME || "ร้านค้าออนไลน์",
    shopLogo: process.env.NEXT_PUBLIC_SHOP_LOGO || "",
    currency: "THB",
    currencySymbol: "฿",
};

export const shippingMethods = [
    { id: "registered", name: "ลงทะเบียน", nameEn: "Registered Mail", price: 0, days: "3-5" },
    { id: "ems", name: "EMS", nameEn: "EMS", price: 0, days: "1-2" },
    { id: "kerry", name: "KERRY", nameEn: "Kerry Express", price: 0, days: "1-2" },
    { id: "flash", name: "FLASH", nameEn: "Flash Express", price: 0, days: "1-2" },
    { id: "jt", name: "J&T Express", nameEn: "J&T Express", price: 0, days: "1-3" },
];

export const paymentMethods = [
    { id: "bank", name: "โอนเงินผ่านธนาคาร", nameEn: "Bank Transfer", icon: "🏦" },
    { id: "promptpay", name: "พร้อมเพย์", nameEn: "PromptPay", icon: "📱" },
    { id: "cod", name: "เก็บเงินปลายทาง", nameEn: "Cash on Delivery", icon: "💵" },
];

export const banks = [
    { id: "kbank", name: "กสิกรไทย", logo: "/logos/banks/kbank.png", color: "#138F2D" },
    { id: "scb", name: "ไทยพาณิชย์", logo: "/logos/banks/scb.png", color: "#4E2E7F" },
    { id: "ktb", name: "กรุงไทย", logo: "/logos/banks/ktb.png", color: "#00AEEF" },
    { id: "bbl", name: "กรุงเทพ", logo: "/logos/banks/bbl.png", color: "#1E4598" },
    { id: "bay", name: "กรุงศรีอยุธยา", logo: "/logos/banks/bay.png", color: "#FFD200" },
    { id: "gsb", name: "ออมสิน", logo: "/logos/banks/gsb.png", color: "#EB198D" },
    { id: "ttb", name: "ทหารไทยธนชาต", logo: "/logos/banks/ttb.png", color: "#005DA4" },
    { id: "baac", name: "ธ.ก.ส.", logo: "/logos/banks/baac.png", color: "#00813D" },
    { id: "uob", name: "ยูโอบี", logo: "/logos/banks/uob.png", color: "#003876" },
];
