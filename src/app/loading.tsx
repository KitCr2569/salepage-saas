export default function GlobalLoading() {
    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%)",
        }}>
            <div style={{ textAlign: "center" }}>
                <div style={{
                    width: "48px",
                    height: "48px",
                    border: "3px solid rgba(255,255,255,0.1)",
                    borderTop: "3px solid #f472b6",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                    margin: "0 auto 1rem",
                }} />
                <p style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "0.875rem",
                    fontFamily: "'Inter', sans-serif",
                }}>
                    กำลังโหลด...
                </p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );
}
