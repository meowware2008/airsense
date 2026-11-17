import cityDioramaImg from '../assets/city-diorama.png'
import './AnimatedCityDiorama.css'

export default function AnimatedCityDiorama({ className = '' }) {
  return (
    <div className={`city-diorama-wrapper ${className}`}>
      {/* 1. Base High-Resolution Diorama Image */}
      <img
        src={cityDioramaImg}
        alt="AirSense Eco-City Environmental Illustration"
        className="city-diorama-base"
        draggable="false"
      />

      {/* 2. Layered SVG Airflow & Canopy Overlays */}
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

          {/* Organic tree canopy gradients */}
          <radialGradient id="canopyGradA" cx="36%" cy="30%" r="68%">
            <stop offset="0%" stopColor="#A8CCA9" stopOpacity="0.88" />
            <stop offset="65%" stopColor="#6E9773" stopOpacity="0.82" />
            <stop offset="100%" stopColor="#4A6F50" stopOpacity="0.75" />
          </radialGradient>

          <radialGradient id="canopyGradB" cx="36%" cy="30%" r="68%">
            <stop offset="0%" stopColor="#B8D7B9" stopOpacity="0.88" />
            <stop offset="65%" stopColor="#81A986" stopOpacity="0.82" />
            <stop offset="100%" stopColor="#567C5C" stopOpacity="0.75" />
          </radialGradient>

          <radialGradient id="canopyHighlight" cx="32%" cy="26%" r="50%">
            <stop offset="0%" stopColor="#E2F0DE" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#A8CCA9" stopOpacity="0" />
          </radialGradient>

          {/* Reusable Leaf Shape */}
          <g id="windLeafShape">
            <path
              d="M0 -9 C5 -5, 6 4, 0 9 C-6 4, -5 -5, 0 -9 Z"
              fill="#7AA380"
              opacity="0.9"
            />
            <line
              x1="0"
              y1="-7"
              x2="0"
              y2="7"
              stroke="#537A59"
              strokeWidth="0.8"
              opacity="0.8"
            />
          </g>
        </defs>

        {/* =================================================================
            LAYER A: Back & Mid Wind Lines (Pass behind trees/spires)
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

        {/* Wind 2: Mid-level airflow through park */}
        <path
          d="M 60 410 C 340 370, 580 440, 880 395 S 1320 430, 1660 390"
          stroke="url(#windGradSage)"
          strokeWidth="2.0"
          className="city-wind-path city-wind-path-2"
        />

        {/* =================================================================
            LAYER B: Swaying Tree Canopies
            Anchored at trunk attachment points; Trunks remain stationary
            ================================================================= */}
        {/* Tree 6: Right backdrop glade canopy */}
        <g className="city-canopy-group canopy-sway-6">
          <ellipse cx="1114" cy="415" rx="38" ry="36" fill="url(#canopyGradB)" />
          <ellipse cx="1108" cy="409" rx="20" ry="16" fill="url(#canopyHighlight)" />
        </g>

        {/* Tree 2: Left tall center tree canopy */}
        <g className="city-canopy-group canopy-sway-2">
          <ellipse cx="376" cy="458" rx="60" ry="56" fill="url(#canopyGradA)" />
          <ellipse cx="366" cy="448" rx="32" ry="26" fill="url(#canopyHighlight)" />
        </g>

        {/* Tree 3: Left cluster companion tree canopy */}
        <g className="city-canopy-group canopy-sway-3">
          <ellipse cx="478" cy="472" rx="44" ry="42" fill="url(#canopyGradB)" />
          <ellipse cx="470" cy="464" rx="24" ry="20" fill="url(#canopyHighlight)" />
        </g>

        {/* Tree 1: Left foreground prominent tree canopy */}
        <g className="city-canopy-group canopy-sway-1">
          <ellipse cx="232" cy="548" rx="52" ry="48" fill="url(#canopyGradA)" />
          <ellipse cx="224" cy="538" rx="28" ry="22" fill="url(#canopyHighlight)" />
        </g>

        {/* Tree 5: Right middle tree canopy */}
        <g className="city-canopy-group canopy-sway-5">
          <ellipse cx="1395" cy="534" rx="48" ry="44" fill="url(#canopyGradA)" />
          <ellipse cx="1388" cy="526" rx="26" ry="20" fill="url(#canopyHighlight)" />
        </g>

        {/* Tree 4: Right foreground prominent tree canopy */}
        <g className="city-canopy-group canopy-sway-4">
          <ellipse cx="1285" cy="545" rx="56" ry="52" fill="url(#canopyGradB)" />
          <ellipse cx="1276" cy="535" rx="30" ry="24" fill="url(#canopyHighlight)" />
        </g>

        {/* =================================================================
            LAYER C: Foreground Wind Lines (Sweep over lower road & garden)
            ================================================================= */}
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
            LAYER D: Drifting Leaves
            Delicate organic leaves drifting across the diorama
            ================================================================= */}
        <g className="city-drifting-leaf city-drifting-leaf-1">
          <use href="#windLeafShape" transform="scale(1.2)" />
        </g>
        <g className="city-drifting-leaf city-drifting-leaf-2">
          <use href="#windLeafShape" transform="scale(1.0)" />
        </g>
        <g className="city-drifting-leaf city-drifting-leaf-3">
          <use href="#windLeafShape" transform="scale(1.15)" />
        </g>
        <g className="city-drifting-leaf city-drifting-leaf-4">
          <use href="#windLeafShape" transform="scale(0.9)" />
        </g>
      </svg>
    </div>
  )
}
