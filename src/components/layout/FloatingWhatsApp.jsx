import { WhatsAppIcon } from "../ui";
import siteConfig from "../../data/siteConfig";

export default function FloatingWhatsApp() {
  return (
    <button
      className="floating-wa"
      onClick={() =>
        window.open(
          `https://wa.me/${siteConfig.whatsappNumber}?text=Hi, I'm interested in your CCTV products`,
          "_blank"
        )
      }
    >
      <WhatsAppIcon size={18} />
      <span>Chat with us</span>
    </button>
  );
}
