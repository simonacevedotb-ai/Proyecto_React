import { useEffect } from "react";

/**
 * Aparición progresiva de elementos al hacer scroll.
 *
 * Cómo se usa:
 *   1. Llamar `useReveal()` una vez en la página.
 *   2. Poner la clase `reveal` (y opcionalmente `reveal-izq`,
 *      `reveal-der`, `reveal-zoom`, `reveal-d1`...`reveal-d5`)
 *      en los elementos que deben aparecer.
 *
 * Usa IntersectionObserver, que el navegador resuelve de forma nativa
 * sin escuchar el evento scroll: no bloquea el hilo principal ni hace
 * lenta la página. Cada elemento se anima una sola vez y deja de
 * observarse.
 *
 * @param {Array} deps  dependencias que, al cambiar, vuelven a
 *                      escanear el DOM (por ejemplo, al cargar datos).
 */
export function useReveal(deps = []) {
  useEffect(() => {
    const elementos = document.querySelectorAll(".reveal:not(.visible)");
    if (!elementos.length) return;

    // Si el navegador no soporta IntersectionObserver, se muestra todo.
    if (typeof IntersectionObserver === "undefined") {
      elementos.forEach((el) => el.classList.add("visible"));
      return;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) {
            entrada.target.classList.add("visible");
            observador.unobserve(entrada.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    elementos.forEach((el) => observador.observe(el));
    return () => observador.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
