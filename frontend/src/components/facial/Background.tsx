import React from "react"

export type BackgroundProps = {
  className?: string
  // URL da imagem de fundo. Se não informado, usa o fallback /pontoBg.jpg
  imageUrl?: string
}

/**
 * Background full-screen com imagem em cover (corta quando necessário).
 * Não redimensiona por breakpoints; sempre cover + center.
 */
export default function Background({ className = "", imageUrl }: BackgroundProps) {
  const src = imageUrl || "/pontoBg.jpg"
  return (
    <div
      aria-hidden
      className={["absolute inset-0 -z-10", className].join(" ")}
      style={{
        backgroundImage: `url('${src}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        // Fallback de cor para a primeira pintura, até a imagem carregar
        backgroundColor: "#0B5ED7",
      }}
    />
  )
}
