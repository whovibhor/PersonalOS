import { useEffect, useRef, useState } from 'react'

type GooeyNavItem = {
    label: string
    href?: string
}

type GooeyNavProps = {
    items: GooeyNavItem[]
    animationTime?: number
    particleCount?: number
    particleDistances?: [number, number]
    particleR?: number
    timeVariance?: number
    colors?: number[]
    initialActiveIndex?: number
}

export default function GooeyNav({
    items,
    animationTime = 600,
    particleCount = 15,
    particleDistances = [90, 10],
    particleR = 100,
    timeVariance = 300,
    colors = [1, 2, 3, 1, 2, 3, 1, 4],
    initialActiveIndex = 0,
}: GooeyNavProps) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const navRef = useRef<HTMLUListElement | null>(null)
    const filterRef = useRef<HTMLSpanElement | null>(null)
    const textRef = useRef<HTMLSpanElement | null>(null)
    const [activeIndex, setActiveIndex] = useState(initialActiveIndex)

    const noise = (n = 1) => n / 2 - Math.random() * n

    const getXY = (distance: number, pointIndex: number, totalPoints: number) => {
        const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180)
        return [distance * Math.cos(angle), distance * Math.sin(angle)] as const
    }

    const createParticle = (i: number, t: number, d: [number, number], r: number) => {
        const rotateNoise = noise(r / 10)
        return {
            start: getXY(d[0], particleCount - i, particleCount),
            end: getXY(d[1] + noise(7), particleCount - i, particleCount),
            time: t,
            scale: 1 + noise(0.2),
            color: colors[Math.floor(Math.random() * colors.length)],
            rotate:
                rotateNoise > 0
                    ? (rotateNoise + r / 20) * 10
                    : (rotateNoise - r / 20) * 10,
        }
    }

    const makeParticles = (element: HTMLElement) => {
        const d = particleDistances
        const r = particleR
        const bubbleTime = animationTime * 2 + timeVariance
        element.style.setProperty('--time', `${bubbleTime}ms`)

        for (let i = 0; i < particleCount; i++) {
            const t = animationTime * 2 + noise(timeVariance * 2)
            const p = createParticle(i, t, d, r)
            element.classList.remove('active')

            setTimeout(() => {
                const particle = document.createElement('span')
                const point = document.createElement('span')
                particle.classList.add('gooey-nav__particle')
                particle.style.setProperty('--start-x', `${p.start[0]}px`)
                particle.style.setProperty('--start-y', `${p.start[1]}px`)
                particle.style.setProperty('--end-x', `${p.end[0]}px`)
                particle.style.setProperty('--end-y', `${p.end[1]}px`)
                particle.style.setProperty('--time', `${p.time}ms`)
                particle.style.setProperty('--scale', `${p.scale}`)
                particle.style.setProperty('--color', `var(--color-${p.color}, white)`)
                particle.style.setProperty('--rotate', `${p.rotate}deg`)
                point.classList.add('gooey-nav__point')
                particle.appendChild(point)
                element.appendChild(particle)

                requestAnimationFrame(() => {
                    element.classList.add('active')
                })

                setTimeout(() => {
                    try {
                        element.removeChild(particle)
                    } catch {
                        // ignore
                    }
                }, t)
            }, 30)
        }
    }

    const updateEffectPosition = (element: HTMLElement) => {
        if (!containerRef.current || !filterRef.current || !textRef.current) return

        const containerRect = containerRef.current.getBoundingClientRect()
        const pos = element.getBoundingClientRect()

        const styles: Partial<CSSStyleDeclaration> = {
            left: `${pos.x - containerRect.x}px`,
            top: `${pos.y - containerRect.y}px`,
            width: `${pos.width}px`,
            height: `${pos.height}px`,
        }

        Object.assign(filterRef.current.style, styles)
        Object.assign(textRef.current.style, styles)
        textRef.current.innerText = element.innerText
    }

    const setActive = (index: number, element: HTMLElement) => {
        if (activeIndex === index) return
        setActiveIndex(index)
        updateEffectPosition(element)

        if (filterRef.current) {
            const particles = filterRef.current.querySelectorAll('.gooey-nav__particle')
            particles.forEach((p) => {
                try {
                    filterRef.current?.removeChild(p)
                } catch {
                    // ignore
                }
            })
        }

        if (textRef.current) {
            textRef.current.classList.remove('active')
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            textRef.current.offsetWidth
            textRef.current.classList.add('active')
        }

        if (filterRef.current) {
            makeParticles(filterRef.current)
        }
    }

    useEffect(() => {
        if (!navRef.current) return
        const activeLi = navRef.current.querySelectorAll('li')[activeIndex] as HTMLLIElement | undefined
        if (activeLi) {
            updateEffectPosition(activeLi)
            textRef.current?.classList.add('active')
        }

        if (!containerRef.current) return

        const resizeObserver = new ResizeObserver(() => {
            const currentActiveLi = navRef.current?.querySelectorAll('li')[activeIndex] as
                | HTMLLIElement
                | undefined
            if (currentActiveLi) updateEffectPosition(currentActiveLi)
        })

        resizeObserver.observe(containerRef.current)
        return () => resizeObserver.disconnect()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeIndex])

    return (
        <>
            {/* This effect is difficult to recreate faithfully with Tailwind alone; this scoped style tag is intentional. */}
            <style>
                {`
          .gooey-nav {
            --color-1: #ffffff;
            --color-2: #ffffff;
            --color-3: #ffffff;
            --color-4: #ffffff;
          }

          .gooey-nav .gooey-nav__effect {
            position: absolute;
            opacity: 1;
            pointer-events: none;
            display: grid;
            place-items: center;
            z-index: 1;
          }

          .gooey-nav .gooey-nav__effect--text {
            color: white;
            transition: color 0.3s ease;
          }

          .gooey-nav .gooey-nav__effect--text.active {
            color: black;
          }

          .gooey-nav .gooey-nav__effect--filter {
            filter: blur(7px) contrast(100) blur(0);
            mix-blend-mode: lighten;
          }

          .gooey-nav .gooey-nav__effect--filter::before {
            content: "";
            position: absolute;
            inset: -75px;
            z-index: -2;
            background: black;
          }

          .gooey-nav .gooey-nav__effect--filter::after {
            content: "";
            position: absolute;
            inset: 0;
            background: white;
            transform: scale(0);
            opacity: 0;
            z-index: -1;
            border-radius: 9999px;
          }

          .gooey-nav .gooey-nav__effect--filter.active::after {
            animation: gooey-nav-pill 0.3s ease both;
          }

          @keyframes gooey-nav-pill {
            to {
              transform: scale(1);
              opacity: 1;
            }
          }

          .gooey-nav .gooey-nav__particle,
          .gooey-nav .gooey-nav__point {
            display: block;
            opacity: 0;
            width: 20px;
            height: 20px;
            border-radius: 9999px;
            transform-origin: center;
          }

          .gooey-nav .gooey-nav__particle {
            --time: 5s;
            position: absolute;
            top: calc(50% - 8px);
            left: calc(50% - 8px);
            animation: gooey-nav-particle calc(var(--time)) ease 1 -350ms;
          }

          .gooey-nav .gooey-nav__point {
            background: var(--color);
            opacity: 1;
            animation: gooey-nav-point calc(var(--time)) ease 1 -350ms;
          }

          @keyframes gooey-nav-particle {
            0% {
              transform: rotate(0deg) translate(calc(var(--start-x)), calc(var(--start-y)));
              opacity: 1;
              animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45);
            }
            70% {
              transform: rotate(calc(var(--rotate) * 0.5))
                translate(calc(var(--end-x) * 1.2), calc(var(--end-y) * 1.2));
              opacity: 1;
              animation-timing-function: ease;
            }
            85% {
              transform: rotate(calc(var(--rotate) * 0.66)) translate(calc(var(--end-x)), calc(var(--end-y)));
              opacity: 1;
            }
            100% {
              transform: rotate(calc(var(--rotate) * 1.2))
                translate(calc(var(--end-x) * 0.5), calc(var(--end-y) * 0.5));
              opacity: 1;
            }
          }

          @keyframes gooey-nav-point {
            0% {
              transform: scale(0);
              opacity: 0;
              animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45);
            }
            25% {
              transform: scale(calc(var(--scale) * 0.25));
            }
            38% {
              opacity: 1;
            }
            65% {
              transform: scale(var(--scale));
              opacity: 1;
              animation-timing-function: ease;
            }
            85% {
              transform: scale(var(--scale));
              opacity: 1;
            }
            100% {
              transform: scale(0);
              opacity: 0;
            }
          }

          .gooey-nav li.gooey-nav__item--active {
            color: black;
            text-shadow: none;
          }

          .gooey-nav li.gooey-nav__item--active::after {
            opacity: 1;
            transform: scale(1);
          }

          .gooey-nav li.gooey-nav__item::after {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: 9999px;
            background: white;
            opacity: 0;
            transform: scale(0);
            transition: all 0.3s ease;
            z-index: -1;
          }
        `}
            </style>

            <div className="gooey-nav relative" ref={containerRef}>
                <nav className="relative flex" style={{ transform: 'translate3d(0,0,0.01px)' }}>
                    <ul
                        ref={navRef}
                        className="m-0 flex list-none gap-2 p-0 px-1 relative z-[3]"
                        style={{
                            color: 'white',
                            textShadow: '0 1px 1px hsl(205deg 30% 10% / 0.2)',
                        }}
                    >
                        {items.map((item, index) => (
                            <li
                                // eslint-disable-next-line react/no-array-index-key
                                key={index}
                                className={`gooey-nav__item rounded-full relative transition-[background-color_color_box-shadow] duration-300 ease shadow-[0_0_0.5px_1.5px_transparent] text-white ${activeIndex === index ? 'gooey-nav__item--active' : ''
                                    }`}
                                onClick={(e) => {
                                    e.preventDefault()
                                    setActive(index, e.currentTarget)
                                }}
                            >
                                <button
                                    type="button"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault()
                                            const liEl = e.currentTarget.parentElement
                                            if (liEl) setActive(index, liEl)
                                        }
                                    }}
                                    className="outline-none py-[0.6em] px-[1em] inline-block text-sm"
                                >
                                    {item.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                <span className="gooey-nav__effect gooey-nav__effect--filter" ref={filterRef} />
                <span className="gooey-nav__effect gooey-nav__effect--text" ref={textRef} />
            </div>
        </>
    )
}
