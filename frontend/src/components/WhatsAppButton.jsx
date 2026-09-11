/**
 * Botón flotante de WhatsApp, reutilizable y fijo en pantalla.
 *
 * Props:
 *  - phone: número de WhatsApp en formato internacional sin "+" (ej: "573001234567")
 *  - message: mensaje precargado opcional
 */
function WhatsAppButton({
  phone = "573001234567",
  message = "Hola, quiero más información sobre PhoneStore.",
}) {
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contáctanos por WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center
                 rounded-full bg-[#25D366] text-white shadow-lg transition-transform
                 duration-200 hover:scale-110 hover:shadow-xl focus:outline-none
                 focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2 sm:h-16 sm:w-16"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        className="h-8 w-8 sm:h-9 sm:w-9"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.386.63 4.62 1.735 6.555L4 29l7.62-1.71A11.93 11.93 0 0 0 16.001 27C22.629 27 28 21.627 28 15S22.629 3 16.001 3Zm0 21.75c-1.99 0-3.85-.58-5.42-1.58l-.39-.24-4.53 1.02 1.03-4.42-.26-.42A9.7 9.7 0 0 1 5.25 15c0-5.93 4.82-10.75 10.75-10.75S26.75 9.07 26.75 15 21.93 24.75 16 24.75Zm5.9-8.05c-.32-.16-1.9-.94-2.2-1.05-.29-.1-.5-.16-.72.16-.21.32-.83 1.05-1.02 1.26-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.6-.95-.85-1.6-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.75-.99-2.39-.26-.63-.53-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.08-1.11 2.64s1.14 3.06 1.3 3.27c.16.21 2.24 3.42 5.42 4.8.76.33 1.35.53 1.81.67.76.24 1.45.21 2 .13.61-.09 1.9-.78 2.17-1.53.27-.75.27-1.4.19-1.53-.08-.13-.29-.21-.61-.37Z" />
      </svg>
    </a>
  );
}

export default WhatsAppButton;
