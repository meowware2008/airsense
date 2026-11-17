import cityDioramaImg from '../assets/city-diorama.png'
import crown1 from '../assets/tree-crown-1.png'
import crown2 from '../assets/tree-crown-2.png'
import crown3 from '../assets/tree-crown-3.png'
import crown4 from '../assets/tree-crown-4.png'
import crown5 from '../assets/tree-crown-5.png'
import crown6 from '../assets/tree-crown-6.png'
import './AnimatedCityDiorama.css'

export default function AnimatedCityDiorama({ className = '' }) {
  return (
    <div className={`city-diorama-wrapper ${className}`}>
      {/* 1. Base Illustrated Artwork (With stationary trunks, roads, buildings & landscape) */}
      <img
        src={cityDioramaImg}
        alt="AirSense Eco-City Environmental Illustration"
        className="city-diorama-base"
        draggable="false"
      />

      {/* 2. Layered SVG Overlay for Animated Isolated Canopies & Wind Streamlines */}
      <svg
        className="city-diorama-svg-overlay"
        viewBox="0 0 1735 906"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="presentation"
        aria-hidden="true"
      >
        <defs>
          {/* Wind line gradients for natural airflow falloff */}
          <linearGradient id="windGradOffWhite" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.05" />
            <stop offset="25%" stopColor="#FFFFFF" stopOpacity="0.8" />
            <stop offset="75%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.1" />
          </linearGradient>

          <linearGradient id="windGradSage" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C2DFCC" stopOpacity="0.05" />
            <stop offset="25%" stopColor="#82AB8A" stopOpacity="0.75" />
            <stop offset="75%" stopColor="#82AB8A" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#C2DFCC" stopOpacity="0.1" />
          </linearGradient>

          {/* Delicate Drifting Leaf Symbol */}
          <g id="detachedLeafShape">
            <path
              d="M 0 -10 C 5 -5, 6 4, 0 10 C -6 4, -5 -5, 0 -10 Z"
              fill="#7EA883"
              stroke="#4A7051"
              strokeWidth="0.8"
            />
            <line
              x1="0"
              y1="-8"
              x2="0"
              y2="8"
              stroke="#38583E"
              strokeWidth="0.6"
            />
          </g>
        </defs>

        {/* =================================================================
            LAYER A: Upper Skyline Wind Lines (Passing above distant hills)
            ================================================================= */}
        {/* Wind 1: High skyline sweep */}
        <path
          d="M 120 270 C 460 230, 780 305, 1120 255 S 1520 285, 1700 255"
          stroke="url(#windGradOffWhite)"
          strokeWidth="2.4"
          className="city-wind-path city-wind-path-1"
        />

        {/* Wind 5: Upper-mid delicate breeze */}
        <path
          d="M 310 330 C 580 295, 890 355, 1220 315 S 1540 335, 1710 305"
          stroke="url(#windGradOffWhite)"
          strokeWidth="1.6"
          className="city-wind-path city-wind-path-5"
        />

        {/* =================================================================
            LAYER B: Isolated Illustrated Tree Canopies Swaying in the Wind
            (Preserves original leaf shapes, textures, colours & proportions)
            ================================================================= */}

        {/* Tree 6: Right backdrop glade tree (anchor 1112px 448px) */}
        <g
          className="city-tree-canopy-layer tree-canopy-sway-6"
          style={{ transformOrigin: '1112px 448px' }}
        >
          <image
            href={crown6}
            x="1065"
            y="365"
            width="95"
            height="90"
            preserveAspectRatio="none"
          />
        </g>

        {/* Tree 2: Tall mid-left tree (anchor 382px 545px) */}
        <g
          className="city-tree-canopy-layer tree-canopy-sway-2"
          style={{ transformOrigin: '382px 545px' }}
        >
          <image
            href={crown2}
            x="295"
            y="385"
            width="150"
            height="165"
            preserveAspectRatio="none"
          />
        </g>

        {/* Tree 3: Left cluster companion tree (anchor 470px 525px) */}
        <g
          className="city-tree-canopy-layer tree-canopy-sway-3"
          style={{ transformOrigin: '470px 525px' }}
        >
          <image
            href={crown3}
            x="425"
            y="415"
            width="105"
            height="115"
            preserveAspectRatio="none"
          />
        </g>

        {/* Tree 1: Left foreground prominent tree (anchor 193px 615px) */}
        <g
          className="city-tree-canopy-layer tree-canopy-sway-1"
          style={{ transformOrigin: '193px 615px' }}
        >
          <image
            href={crown1}
            x="115"
            y="475"
            width="160"
            height="145"
            preserveAspectRatio="none"
          />
        </g>

        {/* Tree 5: Right mid tree (anchor 1393px 595px) */}
        <g
          className="city-tree-canopy-layer tree-canopy-sway-5"
          style={{ transformOrigin: '1393px 595px' }}
        >
          <image
            href={crown5}
            x="1335"
            y="465"
            width="135"
            height="135"
            preserveAspectRatio="none"
          />
        </g>

        {/* Tree 4: Right foreground prominent tree (anchor 1290px 615px) */}
        <g
          className="city-tree-canopy-layer tree-canopy-sway-4"
          style={{ transformOrigin: '1290px 615px' }}
        >
          <image
            href={crown4}
            x="1195"
            y="480"
            width="170"
            height="140"
            preserveAspectRatio="none"
          />
        </g>

        {/* =================================================================
            LAYER C: Mid & Foreground Wind Lines (Sweeping across park & road)
            ================================================================= */}
        {/* Wind 2: Mid-level airflow through glade */}
        <path
          d="M 60 410 C 340 370, 580 440, 880 395 S 1320 430, 1660 390"
          stroke="url(#windGradSage)"
          strokeWidth="2.0"
          className="city-wind-path city-wind-path-2"
        />

        {/* Wind 3: Lower roadway breeze */}
        <path
          d="M 140 540 C 380 495, 660 550, 990 505 S 1380 525, 1680 480"
          stroke="url(#windGradOffWhite)"
          strokeWidth="2.2"
          className="city-wind-path city-wind-path-3"
        />

        {/* Wind 4: Foreground meadow breeze */}
        <path
          d="M 220 640 C 480 605, 760 650, 1080 610 S 1440 600, 1670 560"
          stroke="url(#windGradSage)"
          strokeWidth="1.8"
          className="city-wind-path city-wind-path-4"
        />

        {/* =================================================================
            LAYER D: Detached Drifting Leaves
            ================================================================= */}
        <g className="city-detached-leaf city-detached-leaf-1">
          <use href="#detachedLeafShape" transform="scale(1.1)" />
        </g>
        <g className="city-detached-leaf city-detached-leaf-2">
          <use href="#detachedLeafShape" transform="scale(0.95)" />
        </g>
        <g className="city-detached-leaf city-detached-leaf-3">
          <use href="#detachedLeafShape" transform="scale(1.05)" />
        </g>
        <g className="city-detached-leaf city-detached-leaf-4">
          <use href="#detachedLeafShape" transform="scale(0.85)" />
        </g>
      </svg>
    </div>
  )
}
