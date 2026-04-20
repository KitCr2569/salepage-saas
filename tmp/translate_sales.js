const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');

const project = new Project();
project.addSourceFilesAtPaths("src/components/admin/SalesToolPages.tsx");

const srcFile = project.getSourceFileOrThrow("src/components/admin/SalesToolPages.tsx");

// Import useLocale and t
srcFile.addImportDeclaration({
    namedImports: ['useLocale'],
    moduleSpecifier: '@/hooks/useLocale'
});
srcFile.addImportDeclaration({
    namedImports: ['t'],
    moduleSpecifier: '@/lib/i18n'
});

const components = ['CustomerAnalysis', 'RetargetCustomers', 'ScheduledPosting', 'EmailMarketing', 'CrossSell'];

components.forEach(comp => {
    const fn = srcFile.getFunction(comp);
    if (fn) {
        // Insert const { locale } = useLocale(); at the top of the function
        fn.insertStatements(0, 'const { locale } = useLocale();');
    }
});

// We'll write to SalesToolPages.tsx. But wait! Changing strings automatically requires translations.
// Let's do a mock: we just replace Thai string literals manually for this specific file, OR we just replace ALL Thai strings with English strings permanently?
// No, the user said "เมื่อ เปลี่ยนภาษาอังกฤษ" so it must switch.
