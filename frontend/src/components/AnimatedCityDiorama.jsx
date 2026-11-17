import cityDioramaImg from '../assets/city-diorama.png'
import './AnimatedCityDiorama.css'

export default function AnimatedCityDiorama({ className = '' }) {
  return (
    <div className={`city-diorama-wrapper ${className}`}>
      {/* 1. Base Diorama Image (Outer background color-matched bit-exact to #F3F5F0) */}
      <img
        src={cityDioramaImg}
        alt="AirSense Eco-City Environmental Illustration"
        className="city-diorama-base"
        draggable="false"
      />

      {/* 2. Layered SVG Airflow & Foliage Motion Overlay */}
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

          {/* Natural foliage gradients matching diorama illustration */}
          <radialGradient id="canopyGradA" cx="36%" cy="30%" r="68%">
            <stop offset="0%" stopColor="#A8CCA9" stopOpacity="0.95" />
            <stop offset="65%" stopColor="#6E9773" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#4A6F50" stopOpacity="0.85" />
          </radialGradient>

          <radialGradient id="canopyGradB" cx="36%" cy="30%" r="68%">
            <stop offset="0%" stopColor="#B8D7B9" stopOpacity="0.95" />
            <stop offset="65%" stopColor="#81A986" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#567C5C" stopOpacity="0.85" />
          </radialGradient>

          <radialGradient id="canopyHighlight" cx="32%" cy="26%" r="50%">
            <stop offset="0%" stopColor="#E2F0DE" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#A8CCA9" stopOpacity="0" />
          </radialGradient>

          {/* Individual Cartoon Leaf Symbol */}
          <g id="cartoonLeafShape">
            <path
              d="M 0 0 C -4 -7, -6 -15, 0 -22 C 6 -15, 4 -7, 0 0 Z"
              fill="#7AA380"
              stroke="#4E7554"
              strokeWidth="0.8"
            />
            <path
              d="M 0 0 L 0 -18"
              stroke="#3B5D40"
              strokeWidth="0.7"
              strokeLinecap="round"
            />
          </g>

          {/* Detached Drifting Leaf Symbol */}
          <g id="detachedLeafShape">
            <path
              d="M 0 -11 C 6 -6, 7 5, 0 11 C -7 5, -6 -6, 0 -11 Z"
              fill="#86B08C"
              stroke="#4E7554"
              strokeWidth="0.8"
            />
            <line
              x1="0"
              y1="-9"
              x2="0"
              y2="9"
              stroke="#3B5D40"
              strokeWidth="0.7"
            />
          </g>
        </defs>

        {/* =================================================================
            LAYER A: Back & Mid Wind Lines (Preserved exactly as requested)
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
            LAYER B: Animated Tree Crowns & Individual Swaying Leaves
            (Trunks stationary, crowns sway with wind, leaves sway left/right)
            ================================================================= */}

        {/* --- TREE 6: Right backdrop glade tree (anchor 1112px 448px) --- */}
        <g className="city-tree-crown crown-sway-6">
          <ellipse cx="1112" cy="415" rx="42" ry="38" fill="url(#canopyGradB)" />
          <ellipse cx="1104" cy="405" rx="22" ry="18" fill="url(#canopyHighlight)" />
          {/* Individual Swaying Leaves */}
          <g className="tree-leaf-cluster leaf-flutter-1" style={{ transformOrigin: '1080px 395px' }}>
            <use href="#cartoonLeafShape" transform="translate(1080, 395) scale(0.65) rotate(-40)" />
          </g>
          <g className="tree-leaf-cluster leaf-flutter-2" style={{ transformOrigin: '1112px 380px' }}>
            <use href="#cartoonLeafShape" transform="translate(1112, 380) scale(0.7) rotate(5)" />
          </g>
          <g className="tree-leaf-cluster leaf-flutter-3" style={{ transformOrigin: '1140px 395px' }}>
            <use href="#cartoonLeafShape" transform="translate(1140, 395) scale(0.65) rotate(45)" />
          </g>
          <g className="tree-leaf-cluster leaf-flutter-4" style={{ transformOrigin: '1110px 415px' }}>
            <use href="#cartoonLeafShape" transform="translate(1110, 415) scale(0.6) rotate(15)" />
          </g>
        </g>

        {/* --- TREE 2: Tall mid-left tree (anchor 382px 545px) --- */}
        <g className="city-tree-crown crown-sway-2">
          <ellipse cx="382" cy="475" rx="68" ry="70" fill="url(#canopyGradA)" />
          <ellipse cx="368" cy="450" rx="38" ry="36" fill="url(#canopyHighlight)" />
          {/* Individual Swaying Leaves */}
          <g className="tree-leaf-cluster leaf-flutter-1" style={{ transformOrigin: '328px 425px' }}>
            <use href="#cartoonLeafShape" transform="translate(328, 425) scale(0.85) rotate(-55)" />
          </g>
          <g className="tree-leaf-cluster leaf-flutter-2" style={{ transformOrigin: '352px 410px' }}>
            <use href="#cartoonLeafShape" transform="translate(352, 410) scale(0.9) rotate(-25)" />
          </g>
          <g className="tree-leaf-cluster leaf-flutter-3" style={{ transformOrigin: '385px 406px' }}>
            <use href="#cartoonLeafShape" transform="translate(385, 406) scale(0.95) rotate(10)" />
          </g>
          <g className="tree-leaf-cluster leaf-flutter-4" style={{ transformOrigin: '426px 425px' }}>
            <use href="#cartoonLeafShape" transform="translate(426, 425) scale(0.9) rotate(45)" />
          </g>
          <g className="tree-leaf-cluster leaf-flutter-5" style={{ transformOrigin: '446px 470px' }}>
            <use href="#cartoonLeafShape" transform="translate(446, 470) scale(0.85) rotate(75)" />
          </g>
          <g className="tree-leaf-cluster leaf-flutter-2" style={{ transformOrigin: '360px 465px' }}>
            <use href="#cartoonLeafShape" transform="translate(360, 465) scale(0.8) rotate(-15)" />
          </g>
          <g className="tree-leaf-cluster leaf-flutter-3" style={{ transformOrigin: '405px 485px' }}>
            <use href="#cartoonLeafShape" transform="translate(405, 485) scale(0.8) rotate(25)" />
          </g>
        </g>

        {/* --- TREE 3: Left cluster companion tree (anchor 470px 525px) --- */}
        <g className="city-tree-crown crown-sway-3">
          <ellipse cx="470" cy="475" rx="48" ry="48" fill="url(#canopyGradB)" />
          <ellipse cx="460" cy="460" rx="26" ry="24" fill="url(#canopyHighlight)" />
          {/* Individual Swaying Leaves */}
          <g className="tree-leaf-cluster leaf-flutter-4" style={{ transformOrigin: '435px 442px' }}>
            <use href="#cartoonLeafShape" transform="translate(435, 442) scale(0.75) rotate(-45)" />
          </g>
          <g className="tree-leaf-cluster leaf-flutter-1" style={{ transformOrigin: '470px 428px' }}>
            <use href="#cartoonLeafShape" transform="translate(470, 428) scale(0.8) rotate(5)" />
          </g>
          <g className="tree-leaf-cluster leaf-flutter-2" style={{ transformOrigin: '506px 446px' }}>
            <use href="#cartoonLeafShape" transform="translate(506, 446) scale(0.75) rotate(50)" />
          </g>
          <g className="tree-leaf-cluster leaf-flutter-3" style={{ transformOrigin: '514px 482px' }}>
            <use href="#cartoonLeafShape" transform="translate(514, 482) scale(0.7) rotate(80)" />
          </g>
          <g className="tree-leaf-cluster leaf-flutter-5" style={{ transformOrigin: '468px 476px' }}>
            <use href="#cartoonLeafShape" transform="translate(468, 476) scale(0.7) rotate(20)" />
          </g>
        </g>

        {/* --- TREE 1: Left foreground tree (anchor 193px 615px) --- */}
        <g className="city-tree-crown crown-sway-1">
          <ellipse cx="193" cy="550" rx="65" ry="58" fill="url(#canopyGradA)" />
          <ellipse cx="180" cy="535" rx="36" ry="30" fill="url(#canopyHighlight)" />
          {/* Individual Swaying Leaves */}
          <g className="tree-leaf-cluster leaf-flutter-1" style={{ transformOrigin: '142px 518px' }}>
            <use href="#cartoonLeafShape" transform="translate(142, 518) scale(0.85) rotate(-50)" />
          </g>
          <g className="tree-leaf-cluster leaf-flutter-2" style={{ transformOrigin: '184px 495px' }}>
            <use href="#cartoonLeafShape" transform="translate(184, 495) scale(0.9) rotate(-10)" />
          </g>
          <g className="tree-leaf-cluster leaf-flutter-3" style={{ transformOrigin: '228px 508px' }}>
            <use href="#cartoonLeafShape" transform="translate(228, 508) scale(0.85) rotate(35)" />
          </g>
          <g className="tree-leaf-cluster leaf-flutter-4" style={{ transformOrigin: '254px 546px' }}>
            <use href="#cartoonLeafShape" transform="translate(254, 546) scale(0.8) rotate(70)" />
          </g>
          <g className="tree-leaf-cluster leaf-flutter-5" style={{ transformOrigin: '175px 542px' }}>
            <use href="#cartoonLeafShape" transform="translate(175, 542) scale(0.75) rotate(-20)" />
          </g>
          <g className="tree-leaf-cluster leaf-flutter-2" style={{ transformOrigin: '215px 560px' }}>
            <use href="#cartoonLeafShape" transform="translate(215, 560) scale(0.75) rotate(25)" />
          </g>
        </g>

        {/* --- TREE 5: Right mid tree (anchor 1393px 595px) --- */}
        <g className="city-tree-crown crown-sway-5">
          <ellipse cx="1393" cy="540" rx="56" ry="58" fill="url(#canopyGradA)" />
          <ellipse cx="1380" cy="525" rx="30" ry="28" fill="url(#canopyHighlight)" />
          {/* Individual Swaying Leaves */}
          <g className="tree-leaf-cluster leaf-flutter-3" style={{ transformOrigin: '1344px 525px' }}>
            <use href="#cartoonLeafShape" transform="translate(1344, 525) scale(0.8) rotate(-45)" />
          </g>
          <g className="tree-leaf-cluster leaf-flutter-1" style={{ transformOrigin: '1370px 490px' }}>
            <use href="#cartoonLeafShape" transform="translate(1370, 490) scale(0.85) rotate(-15)" />
          </g>
          <g className="tree-leaf-cluster leaf-flutter-4" style={{ transformOrigin: '1416px 495px' }}>
            <use href="#cartoonLeafShape" transform="translate(1416, 495) scale(0.85) rotate(30)" />
          </g>
          <g className="tree-leaf-cluster leaf-flutter-2" style={{ transformOrigin: '1446px 535px' }}>
            <use href="#cartoonLeafShape" transform="translate(1446, 535) scale(0.75) rotate(75)" />
          </g>
          <g className="tree-leaf-cluster leaf-flutter-5" style={{ transformOrigin: '1390px 540px' }}>
            <use href="#cartoonLeafShape" transform="translate(1390, 540) scale(0.75) rotate(15)" />
          </g>
        </g>

        {/* --- TREE 4: Right foreground prominent tree (anchor 1290px 615px) --- */}
        <g className="city-tree-crown crown-sway-4">
          <ellipse cx="1290" cy="550" rx="72" ry="62" fill="url(#canopyGradB)" />
          <ellipse cx="1275" cy="530" rx="40" ry="32" fill="url(#canopyHighlight)" />
          {/* Individual Swaying Leaves */}
          <g className="tree-leaf-cluster leaf-flutter-1" style={{ transformOrigin: '1226px 540px' }}>
            <use href="#cartoonLeafShape" transform="translate(1226, 540) scale(0.85) rotate(-55)" />
          </g>
          <g className="tree-leaf-cluster leaf-flutter-2" style={{ transformOrigin: '1250px 505px' }}>
            <use href="#cartoonLeafShape" transform="translate(1250, 505) scale(0.9) rotate(-25)" />
          </g>
          <g className="tree-leaf-cluster leaf-flutter-3" style={{ transformOrigin: '1288px 490px' }}>
            <use href="#cartoonLeafShape" transform="translate(1288, 490) scale(0.95) rotate(10)" />
          </g>
          <g className="tree-leaf-cluster leaf-flutter-4" style={{ transformOrigin: '1332px 506px' }}>
            <use href="#cartoonLeafShape" transform="translate(1332, 506) scale(0.9) rotate(45)" />
          </g>
          <g className="tree-leaf-cluster leaf-flutter-5" style={{ transformOrigin: '1356px 548px' }}>
            <use href="#cartoonLeafShape" transform="translate(1356, 548) scale(0.85) rotate(75)" />
          </g>
          <g className="tree-leaf-cluster leaf-flutter-2" style={{ transformOrigin: '1272px 545px' }}>
            <use href="#cartoonLeafShape" transform="translate(1272, 545) scale(0.8) rotate(-15)" />
          </g>
          <g className="tree-leaf-cluster leaf-flutter-3" style={{ transformOrigin: '1314px 562px' }}>
            <use href="#cartoonLeafShape" transform="translate(1314, 562) scale(0.8) rotate(25)" />
          </g>
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
            LAYER D: Detached Leaves Drifting Horizontally Across City
            ================================================================= */}
        <g className="city-detached-leaf city-detached-leaf-1">
          <use href="#detachedLeafShape" transform="scale(1.2)" />
        </g>
        <g className="city-detached-leaf city-detached-leaf-2">
          <use href="#detachedLeafShape" transform="scale(1.05)" />
        </g>
        <g className="city-detached-leaf city-detached-leaf-3">
          <use href="#detachedLeafShape" transform="scale(1.15)" />
        </g>
        <g className="city-detached-leaf city-detached-leaf-4">
          <use href="#detachedLeafShape" transform="scale(0.95)" />
        </g>
      </svg>
    </div>
  )
}
