const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'components', 'admin', 'AdminShipping.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    'import { useState } from "react";\r\nimport { ShippingLogoIcon }',
    'import { useState } from "react";\r\nimport Swal from "sweetalert2";\r\nimport { ShippingLogoIcon }'
);
content = content.replace(
    'import { useState } from "react";\nimport { ShippingLogoIcon }',
    'import { useState } from "react";\nimport Swal from "sweetalert2";\nimport { ShippingLogoIcon }'
);

const oldHandleDelete = `    const handleDelete = (id: string) => {
        if (confirm("ต้องการลบช่องทางขนส่งนี้?")) {
            deleteShipping(id);
            setSuccessMsg("ลบช่องทางขนส่งสำเร็จ!");
            setTimeout(() => setSuccessMsg(null), 2000);
        }
    };`;

const newHandleDelete = `    const handleDelete = async (id: string) => {
        const result = await Swal.fire({
            text: "ต้องการลบช่องทางขนส่งนี้?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ec4899',
            cancelButtonColor: '#9ca3af',
            confirmButtonText: 'ลบ',
            cancelButtonText: 'ยกเลิก'
        });
        if (result.isConfirmed) {
            deleteShipping(id);
            setSuccessMsg("ลบช่องทางขนส่งสำเร็จ!");
            setTimeout(() => setSuccessMsg(null), 2000);
        }
    };`;

content = content.replace(oldHandleDelete, newHandleDelete);
content = content.replace(oldHandleDelete.replace(/\n/g, '\r\n'), newHandleDelete.replace(/\n/g, '\r\n'));

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed AdminShipping.tsx');
