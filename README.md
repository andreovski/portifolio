# Portfólio do Deco

Site pessoal de André Luiz (Deco): produtos digitais, automações e agentes de IA.

Feito com [Astro](https://astro.build), sem framework de UI. Direção visual "Editorial Arcade": fundo escuro, títulos em Jersey 15, texto em Space Mono e uma cor de destaque por seção.

## Rodando

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # gera dist/
npm run preview  # serve o build
```

## Onde mexer

| O quê | Arquivo |
| --- | --- |
| Nome, descrição, e-mail, WhatsApp | `src/data/site.ts` |
| Seções da home | `src/components/*.astro` |
| Estilos e tokens de cor | `src/styles/global.css` |
| Efeitos (retrato ASCII, rastro, modo leve) | `src/scripts/main.js` |
| Imagens e vídeo da hero | `public/img/` |

O domínio ainda não foi comprado. Quando for, troque `site` em `astro.config.mjs`.

## Desempenho e acessibilidade

- Com "Modo leve", `prefers-reduced-motion` ou economia de dados, as animações param e o vídeo da hero fica num quadro estático.
- O vídeo da hero só toca enquanto a seção está na tela. O celular recebe uma versão recortada e mais leve (`hero-bg-m.mp4`).
- Fontes servidas pelo próprio site via Fontsource.
