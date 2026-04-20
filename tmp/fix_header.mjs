import fs from 'fs';

let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

code = code.replace(
    /onClick=\{\(\) => setLanguage\(language === "th" \? "en" : "th"\)\}/g,
    `onClick={() => {
                            const newLang = language === "th" ? "en" : "th";
                            setLanguage(newLang);
                            if (typeof window !== "undefined") {
                                window.localStorage.setItem("hdg-locale", newLang);
                            }
                            import("@/store/useLocaleStore").then(m => m.useLocaleStore.getState().setLocale(newLang));
                        }}`
);

fs.writeFileSync('src/components/Header.tsx', code);
console.log('Fixed Header.tsx language switch');
