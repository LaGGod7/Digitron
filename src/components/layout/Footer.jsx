import siteConfig from "../../data/siteConfig";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div>
            <div className="footer-brand-name">{siteConfig.storeName}</div>
            <div className="footer-brand-desc">
              Professional CCTV solutions for homes, shops, and commercial spaces across Hubbali and
              North Karnataka.
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              {["FB", "IG", "YT"].map((s) => (
                <div
                  key={s}
                  style={{
                    width: 30,
                    height: 30,
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "rgba(255,255,255,0.4)",
                    fontSize: 10,
                  }}
                >
                  {s}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="footer-col-title">Products</div>
            {["IP Cameras", "Analog Cameras", "NVR / DVR", "Cables & Accessories", "Packages"].map(
              (t) => (
                <a key={t} className="footer-link">
                  {t}
                </a>
              )
            )}
          </div>

          <div>
            <div className="footer-col-title">Company</div>
            {["About Us", "Contact Us", "Privacy Policy", "Terms of Service"].map((t) => (
              <a key={t} className="footer-link">
                {t}
              </a>
            ))}
          </div>

          <div>
            <div className="footer-col-title">Contact</div>
            <div className="footer-link">📍 {siteConfig.address.line2}</div>
            <div className="footer-link">📞 {siteConfig.phoneNumber}</div>
            <div className="footer-link">✉️ {siteConfig.email}</div>
            <div className="footer-link">🕐 {siteConfig.hours.weekday}</div>
          </div>
        </div>

        <hr className="footer-divider" />
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} {siteConfig.storeName}. All rights reserved.</span>
          <span>Hubbali, Karnataka, India</span>
        </div>
      </div>
    </footer>
  );
}
