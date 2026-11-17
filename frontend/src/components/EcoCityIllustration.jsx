export default function EcoCityIllustration({ className = '' }) {
  return (
    <svg
      viewBox="0 0 520 340"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Isometric green city diorama"
    >
      <defs>
        {/* Soft podium shadow */}
        <filter id="podiumShadow" x="30" y="190" width="460" height="150" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="16" stdDeviation="18" floodColor="#27382B" floodOpacity="0.14" />
        </filter>

        {/* Gradients */}
        <linearGradient id="podiumTopGrad" x1="100" y1="180" x2="420" y2="290" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A4BFA8" />
          <stop offset="45%" stopColor="#8DA892" />
          <stop offset="100%" stopColor="#78937E" />
        </linearGradient>

        <linearGradient id="podiumRimGrad" x1="60" y1="240" x2="460" y2="290" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#556E5A" />
          <stop offset="50%" stopColor="#435948" />
          <stop offset="100%" stopColor="#35473A" />
        </linearGradient>

        <linearGradient id="roadGrad" x1="120" y1="220" x2="400" y2="270" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#CAD3C9" />
          <stop offset="100%" stopColor="#B3BEB2" />
        </linearGradient>

        {/* Building gradients */}
        <linearGradient id="bldgTallFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A2B7A6" />
          <stop offset="100%" stopColor="#7E9683" />
        </linearGradient>
        <linearGradient id="bldgTallSide" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#829A87" />
          <stop offset="100%" stopColor="#627867" />
        </linearGradient>

        <linearGradient id="bldgWhiteFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F5F7F3" />
          <stop offset="100%" stopColor="#DEE4DC" />
        </linearGradient>
        <linearGradient id="bldgWhiteSide" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D2DBD0" />
          <stop offset="100%" stopColor="#BAC5B8" />
        </linearGradient>

        <linearGradient id="bldgGlassFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#BFD3C4" />
          <stop offset="100%" stopColor="#9FB4A4" />
        </linearGradient>
        <linearGradient id="bldgGlassSide" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#97AC9D" />
          <stop offset="100%" stopColor="#768B7C" />
        </linearGradient>

        {/* Tree gradients */}
        <radialGradient id="treeGrad1" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#8DB393" />
          <stop offset="60%" stopColor="#658A6C" />
          <stop offset="100%" stopColor="#4A6C50" />
        </radialGradient>
        <radialGradient id="treeGrad2" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#9EBEA3" />
          <stop offset="60%" stopColor="#75987A" />
          <stop offset="100%" stopColor="#55755A" />
        </radialGradient>
        <radialGradient id="treeGrad3" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#B2CCB7" />
          <stop offset="60%" stopColor="#86A68C" />
          <stop offset="100%" stopColor="#638068" />
        </radialGradient>
      </defs>

      {/* 1. Background soft clouds */}
      <g opacity="0.65">
        {/* Left Cloud */}
        <path
          d="M110 135 C110 125, 125 118, 140 122 C148 114, 168 114, 176 124 C184 120, 198 126, 196 135 Z"
          fill="#E7ECE4"
        />
        {/* Right Cloud */}
        <path
          d="M345 120 C345 112, 358 106, 370 109 C377 102, 394 102, 401 110 C408 106, 420 111, 418 120 Z"
          fill="#E7ECE4"
        />
        {/* Center-left subtle wisps */}
        <path
          d="M200 105 C200 98, 212 94, 222 96 C228 90, 242 90, 248 97 C254 94, 264 98, 262 105 Z"
          fill="#EFF3EC"
          opacity="0.8"
        />
      </g>

      {/* 2. Isometric Circular Podium Base */}
      {/* Soft Drop Shadow */}
      <ellipse cx="260" cy="275" rx="205" ry="46" fill="#203325" opacity="0.14" filter="url(#podiumShadow)" />

      {/* Podium Rim Thickness */}
      <path
        d="M 55 245
           A 205 52 0 0 0 465 245
           L 465 264
           A 205 52 0 0 1 55 264
           Z"
        fill="url(#podiumRimGrad)"
      />

      {/* Podium Top Turf Surface */}
      <ellipse cx="260" cy="245" rx="205" ry="52" fill="url(#podiumTopGrad)" />

      {/* Inner lighter grass hill highlight */}
      <ellipse cx="260" cy="242" rx="192" ry="46" fill="#8CA891" opacity="0.6" />

      {/* 3. Curved Asphalt Road Loop */}
      <path
        d="M 98 252
           C 120 280, 280 294, 410 262
           C 442 254, 442 240, 420 236
           C 300 264, 150 252, 120 236
           C 100 240, 90 248, 98 252 Z"
        fill="url(#roadGrad)"
      />
      {/* Road subtle center markings */}
      <path
        d="M 145 258 C 220 274, 305 274, 380 256"
        stroke="#FFFFFF"
        strokeWidth="1.6"
        strokeDasharray="6 8"
        strokeLinecap="round"
        opacity="0.65"
      />

      {/* 4. Buildings & City Skyline in Center */}
      <g>
        {/* Back Building - Left Tower */}
        <g>
          {/* Top roof */}
          <polygon points="190,148 206,140 222,148 206,156" fill="#CAD7CD" />
          {/* Left front face */}
          <polygon points="190,148 206,156 206,212 190,204" fill="url(#bldgGlassFront)" />
          {/* Right side face */}
          <polygon points="206,156 222,148 222,204 206,212" fill="url(#bldgGlassSide)" />
          {/* Windows */}
          <rect x="194" y="156" width="3" height="4" fill="#E8F1EA" opacity="0.8" />
          <rect x="200" y="159" width="3" height="4" fill="#E8F1EA" opacity="0.8" />
          <rect x="194" y="166" width="3" height="4" fill="#E8F1EA" opacity="0.8" />
          <rect x="200" y="169" width="3" height="4" fill="#E8F1EA" opacity="0.8" />
          <rect x="194" y="176" width="3" height="4" fill="#E8F1EA" opacity="0.8" />
          <rect x="200" y="179" width="3" height="4" fill="#E8F1EA" opacity="0.8" />
          <rect x="194" y="186" width="3" height="4" fill="#E8F1EA" opacity="0.8" />
          <rect x="200" y="189" width="3" height="4" fill="#E8F1EA" opacity="0.8" />
        </g>

        {/* Tall Centerpiece Skyscraper with Spire */}
        <g>
          {/* Spire */}
          <line x1="262" y1="88" x2="262" y2="108" stroke="#4C6552" strokeWidth="2" strokeLinecap="round" />
          {/* Roof */}
          <polygon points="246,112 262,104 278,112 262,120" fill="#D3E0D6" />
          {/* Front left face */}
          <polygon points="246,112 262,120 262,216 246,208" fill="url(#bldgTallFront)" />
          {/* Side right face */}
          <polygon points="262,120 278,112 278,208 262,216" fill="url(#bldgTallSide)" />

          {/* Window Columns */}
          <g fill="#EAF3EC" opacity="0.85">
            <rect x="250" y="122" width="3" height="4" />
            <rect x="256" y="125" width="3" height="4" />
            <rect x="250" y="132" width="3" height="4" />
            <rect x="256" y="135" width="3" height="4" />
            <rect x="250" y="142" width="3" height="4" />
            <rect x="256" y="145" width="3" height="4" />
            <rect x="250" y="152" width="3" height="4" />
            <rect x="256" y="155" width="3" height="4" />
            <rect x="250" y="162" width="3" height="4" />
            <rect x="256" y="165" width="3" height="4" />
            <rect x="250" y="172" width="3" height="4" />
            <rect x="256" y="175" width="3" height="4" />
            <rect x="250" y="182" width="3" height="4" />
            <rect x="256" y="185" width="3" height="4" />
            <rect x="250" y="192" width="3" height="4" />
            <rect x="256" y="195" width="3" height="4" />
          </g>
        </g>

        {/* Right Modern Glass Office */}
        <g>
          {/* Roof */}
          <polygon points="280,154 298,145 316,154 298,163" fill="#D6E2D9" />
          {/* Front left face */}
          <polygon points="280,154 298,163 298,220 280,211" fill="url(#bldgGlassFront)" />
          {/* Side right face */}
          <polygon points="298,163 316,154 316,211 298,220" fill="url(#bldgGlassSide)" />
          {/* Window stripes */}
          <g fill="#F2F7F2" opacity="0.9">
            <rect x="284" y="164" width="4" height="4" />
            <rect x="291" y="168" width="4" height="4" />
            <rect x="284" y="174" width="4" height="4" />
            <rect x="291" y="178" width="4" height="4" />
            <rect x="284" y="184" width="4" height="4" />
            <rect x="291" y="188" width="4" height="4" />
            <rect x="284" y="194" width="4" height="4" />
            <rect x="291" y="198" width="4" height="4" />
          </g>
        </g>

        {/* Front Left Crisp White Low-Rise Building */}
        <g>
          {/* Roof */}
          <polygon points="214,178 232,169 250,178 232,187" fill="#FFFFFF" />
          {/* Front face */}
          <polygon points="214,178 232,187 232,232 214,223" fill="url(#bldgWhiteFront)" />
          {/* Side face */}
          <polygon points="232,187 250,178 250,223 232,232" fill="url(#bldgWhiteSide)" />
          {/* Windows */}
          <g fill="#5F7B66" opacity="0.7">
            <rect x="219" y="190" width="3" height="4" />
            <rect x="225" y="193" width="3" height="4" />
            <rect x="219" y="199" width="3" height="4" />
            <rect x="225" y="202" width="3" height="4" />
            <rect x="219" y="208" width="3" height="4" />
            <rect x="225" y="211" width="3" height="4" />
            <rect x="219" y="217" width="3" height="4" />
            <rect x="225" y="220" width="3" height="4" />
          </g>
        </g>

        {/* Front Center Stepped Eco-Complex */}
        <g>
          {/* Upper Tier Roof */}
          <polygon points="252,192 270,183 288,192 270,201" fill="#FFFFFF" />
          {/* Upper Front */}
          <polygon points="252,192 270,201 270,238 252,229" fill="url(#bldgWhiteFront)" />
          {/* Upper Side */}
          <polygon points="270,201 288,192 288,229 270,238" fill="url(#bldgWhiteSide)" />
          {/* Windows */}
          <g fill="#5F7B66" opacity="0.65">
            <rect x="257" y="204" width="4" height="4" />
            <rect x="263" y="207" width="4" height="4" />
            <rect x="257" y="213" width="4" height="4" />
            <rect x="263" y="216" width="4" height="4" />
            <rect x="257" y="222" width="4" height="4" />
            <rect x="263" y="225" width="4" height="4" />
          </g>
        </g>

        {/* Right Corner Building */}
        <g>
          <polygon points="304,186 318,179 332,186 318,193" fill="#D6E2D9" />
          <polygon points="304,186 318,193 318,228 304,221" fill="url(#bldgTallFront)" />
          <polygon points="318,193 332,186 332,221 318,228" fill="url(#bldgTallSide)" />
        </g>
      </g>

      {/* 5. Electric Eco Transit Bus on Road */}
      <g>
        {/* Shadow */}
        <ellipse cx="245" cy="254" rx="26" ry="6" fill="#203325" opacity="0.25" />

        {/* Bus Body */}
        {/* Roof */}
        <polygon points="226,236 244,231 262,237 244,242" fill="#FFFFFF" />
        {/* Left Front (Windshield side) */}
        <polygon points="226,236 244,242 244,251 226,245" fill="#E6EDE7" />
        {/* Passenger side */}
        <polygon points="244,242 262,237 262,246 244,251" fill="#4B6654" />

        {/* Windshield */}
        <polygon points="228,238 242,242 242,246 228,242" fill="#2D4234" />
        {/* Windows */}
        <rect x="246" y="242" width="4" height="4" fill="#CFDFD4" />
        <rect x="251" y="241" width="4" height="4" fill="#CFDFD4" />
        <rect x="256" y="239" width="4" height="4" fill="#CFDFD4" />

        {/* Wheels */}
        <circle cx="236" cy="249" r="3" fill="#1E2B21" />
        <circle cx="254" cy="249" r="3" fill="#1E2B21" />
      </g>

      {/* 6. Lush Trees & Foliage Array */}
      <g>
        {/* Far Left Trees */}
        <g>
          {/* Trunk */}
          <line x1="126" y1="236" x2="126" y2="246" stroke="#483B32" strokeWidth="2.5" strokeLinecap="round" />
          {/* Canopy */}
          <circle cx="126" cy="226" r="14" fill="url(#treeGrad1)" />
          <circle cx="120" cy="228" r="9" fill="url(#treeGrad2)" opacity="0.8" />
        </g>

        <g>
          <line x1="150" y1="240" x2="150" y2="252" stroke="#483B32" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="150" cy="230" r="16" fill="url(#treeGrad2)" />
          <circle cx="158" cy="232" r="11" fill="url(#treeGrad1)" opacity="0.8" />
        </g>

        {/* Mid-Left Cluster */}
        <g>
          <line x1="178" y1="232" x2="178" y2="244" stroke="#483B32" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="178" cy="220" r="18" fill="url(#treeGrad3)" />
          <circle cx="170" cy="222" r="12" fill="url(#treeGrad2)" opacity="0.8" />
        </g>

        <g>
          <line x1="198" y1="238" x2="198" y2="248" stroke="#483B32" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="198" cy="228" r="13" fill="url(#treeGrad1)" />
        </g>

        {/* Right Side Trees */}
        <g>
          <line x1="334" y1="240" x2="334" y2="250" stroke="#483B32" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="334" cy="228" r="14" fill="url(#treeGrad2)" />
          <circle cx="340" cy="226" r="10" fill="url(#treeGrad3)" opacity="0.8" />
        </g>

        <g>
          <line x1="360" y1="234" x2="360" y2="246" stroke="#483B32" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="360" cy="220" r="17" fill="url(#treeGrad1)" />
          <circle cx="352" cy="222" r="11" fill="url(#treeGrad2)" opacity="0.8" />
        </g>

        <g>
          <line x1="388" y1="242" x2="388" y2="252" stroke="#483B32" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="388" cy="230" r="15" fill="url(#treeGrad3)" />
          <circle cx="396" cy="232" r="10" fill="url(#treeGrad1)" opacity="0.8" />
        </g>

        <g>
          <line x1="412" y1="238" x2="412" y2="246" stroke="#483B32" strokeWidth="2" strokeLinecap="round" />
          <circle cx="412" cy="228" r="12" fill="url(#treeGrad2)" />
        </g>
      </g>
    </svg>
  )
}
