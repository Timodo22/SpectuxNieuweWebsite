// App.jsx

import React, { Suspense, useState, useEffect, useRef } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

import FPSCamera from "./ScrollCamera";
import AutoSpotLights from "./AutoSpotLights";

// =========================================
// KLEUR & GRADIENT DEFINITIES
// =========================================
// Gradient van Links naar Rechts (voor horizontale randen/glow)
const GRADIENT_LR = "linear-gradient(to right, #333399, #ff00cc)";
// Gradient van Boven naar Beneden (voor langwerpige verticale balken)
const GRADIENT_TB = "linear-gradient(to bottom, #333399, #ff00cc)";

const THEME_COLOR_SOLID = "#ff00cc"; // Back-up kleur voor schaduwen

// =========================================
// 0. GLOBALE STIJLEN
// =========================================
const GlobalStyles = () => (
  <style>{`
    html, body, #root {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      overscroll-behavior: none;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    }
  `}</style>
);

// =========================================
// 1. DATA
// =========================================
const PAINTING_DATA = {
  "PaitingsInside_Painting_0002": {
    title: "TK Sports Academy",
    description: "TK Sports Academy zocht een effectieve manier om hun sportkampen te promoten. Wij realiseerden een website met een slim aanmeldformulier dat direct bevestigingsmails verstuurt en alle inschrijvingen automatisch verwerkt in Excel. Volledige administratieve automatisering.",
    image: "/assets/sport_preview.jpg",
  },
  "PaitingsInside_Painting_0014": {
    title: "AVANT Logistics",
    description: "Voor AVANT Logistics ontwikkelde Spectux een stijlvolle maatwerk website én een geavanceerd Track & Trace portaal. Groothandels geven bestellingen door, waarna de koerier direct de optimale route en ritinformatie in het systeem ziet verschijnen.",
    image: "/assets/avant_preview.jpg",
  },
  "PaitingsInside_Painting_0008": {
    title: "Deurluifel.nl",
    description: "Deurluifel.nl zocht een technische partner voor het totaalplaatje. Wij verzorgen de Shopify-ontwikkeling, beheren de Google Ads campagnes, automatiseren de e-mailmarketing en bouwen complexe API-koppelingen met externe leveranciers.",
    image: "/assets/design_preview.jpg",
  },
    "PaitingsInside_Painting_0020": {
    title: "Ontwerp Studio Anouk",
    description: "Anouk combineert creativiteit met een passie voor stijl. Spectux vertaalde haar visie naar een digitaal portfolio waarin haar interieurdesigns perfect tot hun recht komen.",
    image: "/assets/design_preview.jpg",
  },
};

// =========================================
// 2. UI COMPONENTS
// =========================================

// --- A. Instructie Overlay ---
function InstructionOverlay({ isVisible, isMobile }) {
  return (
    // WRAPPER DIV voor de Gradient Rand (Links naar Rechts)
    <div style={{
      position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)",
      background: GRADIENT_LR, // De gradient rand
      padding: "2px", // Dikte van de rand
      borderRadius: "32px",
      opacity: isVisible ? 1 : 0, transition: "opacity 0.5s ease",
      pointerEvents: "none", zIndex: 20, width: isMobile ? "90%" : "auto",
      boxShadow: `0 0 15px ${THEME_COLOR_SOLID}40` // Lichte gloed
    }}>
      {/* INHOUD DIV (Zwarte achtergrond) */}
      <div style={{
        background: "rgba(0, 0, 0, 0.9)", 
        color: "white", 
        padding: "15px 25px",
        borderRadius: "30px", 
        textAlign: "center"
      }}>
        <h3 style={{ 
          margin: "0 0 5px 0", 
          fontSize: "16px", 
          color: "white", // TITEL GEWOON WIT
          textTransform: "uppercase",
          fontWeight: "bold",
          letterSpacing: "1px"
        }}>
          Welkom in het Spectux museum
        </h3>
        <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.4", color: "#ccc" }}>
          {isMobile 
            ? <span>Links: <b>Lopen</b> &nbsp;|&nbsp; Rechts: <b>Rondkijken</b></span>
            : "Gebruik W A S D om rond te lopen en je MUIS om rond te kijken."}
        </p>
      </div>
    </div>
  );
}

// --- B. Rotate Device Overlay ---
function RotateDeviceOverlay({ isVisible }) {
  if (!isVisible) return null;
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
      background: "linear-gradient(135deg, #000000 0%, #1a1a1a 100%)", 
      color: "white", zIndex: 9999,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      textAlign: "center", padding: "20px",
      touchAction: "none"
    }}>
      {/* Logo met Gradient */}
      <div style={{ 
          width: "80px", height: "80px", 
          background: GRADIENT_LR, // Gradient bol
          borderRadius: "50%", marginBottom: "20px", display: 'flex', 
          alignItems: 'center', justifyContent: 'center', fontSize: '30px', fontWeight: 'bold'
      }}>
        M
      </div>

      <div style={{ fontSize: "50px", marginBottom: "15px", animation: "spin 4s infinite linear" }}>⟳</div>
      <h2 style={{ fontSize: "24px", margin: "0 0 10px 0", color: "white" }}>
        Draai je scherm
      </h2>
      <p style={{ fontSize: "16px", color: "#ccc", maxWidth: "300px", lineHeight: "1.5" }}>
        Deze ervaring werkt het beste in liggende modus (Landscape).
      </p>
      
      <style>{`
        @keyframes spin { 100% { transform: rotate(90deg); } }
      `}</style>
    </div>
  );
}

// --- C. Info Panel ---
function InfoPanel({ activeMesh, isMobile }) {
  const paintingId = activeMesh ? activeMesh.userData.paintingId : null;
  const data = paintingId ? PAINTING_DATA[paintingId] : null;
  
  const content = data || { 
    title: paintingId || "Onbekend", 
    description: "Geen data gevonden voor dit ID.", 
    image: null 
  };
  
  const visible = !!activeMesh;

  const containerStyle = isMobile ? {
     flexDirection: "column",
     width: "90%",
     height: "auto",
     maxHeight: "60vh",
     bottom: "20px"
  } : {
     flexDirection: "row",
     width: "auto",
     height: "180px",
     bottom: "50px"
  };

  return (
    <div style={{
        position: "fixed", left: 0, width: "100%",
        display: "flex", justifyContent: "center", alignItems: "flex-end",
        zIndex: 10, pointerEvents: "none", 
        bottom: containerStyle.bottom
    }}>
      <div style={{ 
        display: "flex", 
        flexDirection: containerStyle.flexDirection,
        alignItems: "stretch", 
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)",
        pointerEvents: visible ? "auto" : "none",
        width: containerStyle.width
      }}>
        
        {/* TEKST CONTAINER */}
        <div style={{
           display: 'flex', 
           flexDirection: isMobile ? 'column' : 'row', // Op desktop gradient links, mobiel boven
           background: "rgba(10, 10, 10, 0.95)", 
           borderRadius: isMobile ? "0 0 15px 15px" : "15px 0 0 15px",
           width: isMobile ? "100%" : "320px",
           overflow: 'hidden', // Zorgt dat gradient netjes in de ronding blijft
           order: isMobile ? 2 : 1
        }}>
            {/* DE GRADIENT BALK (Het "Langwerpige") */}
            <div style={{
                width: isMobile ? "100%" : "6px", // Dunner op desktop, breed op mobiel
                height: isMobile ? "6px" : "auto",
                background: isMobile ? GRADIENT_LR : GRADIENT_TB, // Desktop: Boven-Beneden, Mobiel: Links-Rechts
                flexShrink: 0
            }} />

            <div style={{ padding: "20px", boxSizing: 'border-box' }}>
              <h2 style={{ 
                margin: "0 0 8px 0", fontSize: isMobile ? "18px" : "22px", fontWeight: "bold", 
                color: "white" // TITEL WIT
              }}>
                {content.title}
              </h2>
              <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.5", color: "#ddd" }}>
                {content.description}
              </p>
            </div>
        </div>

        {/* AFBEELDING DEEL */}
        <div style={{
           background: "rgba(255, 255, 255, 0.1)", padding: "5px", 
           borderRadius: isMobile ? "15px 15px 0 0" : "0 15px 15px 0",
           width: isMobile ? "100%" : "260px",
           height: isMobile ? "150px" : "auto",
           boxSizing: 'border-box',
           display: "flex", 
           order: isMobile ? 1 : 2,
           overflow: "hidden"
        }}>
          {content.image && <img src={content.image} alt="Art" style={{ 
              width: "100%", height: "100%", objectFit: "cover", borderRadius: "10px" 
          }} />}
        </div>

      </div>
    </div>
  );
}

// --- D. Mobile Controls ---
function MobileControls({ joystickRef, lookRef, onInteract }) {
  const stickRef = useRef();
  const baseRef = useRef();
  
  const handleStickStart = (e) => { onInteract(); };
  const handleStickMove = (e) => {
    if(e.cancelable) e.preventDefault();
    onInteract();

    const touch = e.targetTouches[0];
    const baseRect = baseRef.current.getBoundingClientRect();
    const centerX = baseRect.left + baseRect.width / 2;
    const centerY = baseRect.top + baseRect.height / 2;
    const maxDist = baseRect.width / 2;
    
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    if(dist > maxDist) {
        dx = (dx / dist) * maxDist;
        dy = (dy / dist) * maxDist;
    }
    stickRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    joystickRef.current = { x: dx / maxDist, y: -(dy / maxDist) };
  };

  const handleStickEnd = (e) => {
    if(e.cancelable) e.preventDefault();
    stickRef.current.style.transform = `translate(0px, 0px)`;
    joystickRef.current = { x: 0, y: 0 };
  };

  // LOOK LOGICA
  const lastTouch = useRef({ x: 0, y: 0 });
  const handleLookStart = (e) => {
    if(e.cancelable) e.preventDefault();
    onInteract();
    lastTouch.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
  };

  const handleLookMove = (e) => {
    if(e.cancelable) e.preventDefault();
    onInteract();
    const x = e.targetTouches[0].clientX;
    const y = e.targetTouches[0].clientY;
    lookRef.current = { x: x - lastTouch.current.x, y: y - lastTouch.current.y };
    lastTouch.current = { x, y };
  };
  
  const handleLookEnd = (e) => {
    if(e.cancelable) e.preventDefault();
    lookRef.current = { x: 0, y: 0 };
  };

  return (
    <>
      {/* JOYSTICK (Links) */}
      <div style={{ 
          position: 'fixed', bottom: 50, left: 40, width: 120, height: 120, zIndex: 50, touchAction: 'none' 
      }}>
         <div ref={baseRef} 
              onTouchStart={handleStickStart} 
              onTouchMove={handleStickMove} 
              onTouchEnd={handleStickEnd}
              style={{ 
                  width: '100%', height: '100%', background: 'rgba(255,255,255,0.1)', 
                  borderRadius: '50%', position: 'relative', border: '2px solid rgba(255,255,255,0.3)' 
              }}>
            <div ref={stickRef} style={{ 
                width: 50, height: 50, 
                background: GRADIENT_LR, // Gradient Bal
                borderRadius: '50%', opacity: 0.9,
                position: 'absolute', top: '50%', left: '50%', marginTop: -25, marginLeft: -25, pointerEvents: 'none',
                boxShadow: `0 0 15px ${THEME_COLOR_SOLID}`
            }} />
         </div>
      </div>

      {/* KIJKEN INDICATOR (Rechts) */}
      <div style={{
          position: 'fixed', bottom: 85, right: 75, zIndex: 48, pointerEvents: 'none', opacity: 0.6,
          display: 'flex', flexDirection: 'column', alignItems: 'center'
      }}>
          <div style={{ 
              width: 50, height: 50, border: '2px solid white', borderRadius: '50%', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.3)'
          }}>
            <div style={{ width: 20, height: 20, background: GRADIENT_LR, borderRadius: '50%' }} />
          </div>
          <div style={{ color: 'white', fontSize: '10px', marginTop: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>Kijken</div>
      </div>

      <div 
        onTouchStart={handleLookStart}
        onTouchMove={handleLookMove}
        onTouchEnd={handleLookEnd}
        style={{ 
            position: 'fixed', top: 0, right: 0, width: '50vw', height: '100vh', 
            zIndex: 49, touchAction: 'none'
        }} 
      />
    </>
  );
}

// =========================================
// 3. LOGICA HELPERS
// =========================================
function Museum({ scene }) {
  useEffect(() => {
    scene.traverse((obj) => {
      if (obj.isMesh) {
        if (obj.material) obj.material.side = THREE.DoubleSide;
        
        const myName = obj.name.toLowerCase();
        const parentName = obj.parent ? obj.parent.name.toLowerCase() : "";
        const isPainting = myName.includes("painting") || myName.includes("paiting") || parentName.includes("painting");

        if (isPainting) {
          obj.userData.isPainting = true;
          if (myName.includes("painting") || myName.includes("paiting")) {
              obj.userData.paintingId = obj.name; 
          } else {
              obj.userData.paintingId = obj.parent.name;
          }
        }
      }
    });
  }, [scene]);
  return <primitive object={scene} />;
}

function LookAtPainting({ scene, onChange }) {
  const { camera } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const last = useRef(null);
  
  useFrame(() => {
    raycaster.current.setFromCamera({ x: 0, y: 0 }, camera);
    const intersects = raycaster.current.intersectObject(scene, true);
    
    let foundPainting = null;
    for (let i = 0; i < intersects.length; i++) {
      const obj = intersects[i].object;
      if (!obj.visible) continue;
      if (obj.userData.isPainting) {
        foundPainting = obj;
        break; 
      }
    }

    if (foundPainting) {
      if (foundPainting !== last.current) {
        last.current = foundPainting;
        onChange(foundPainting);
      }
    } else {
      if (last.current) {
        last.current = null;
        onChange(null);
      }
    }
  });
  return null;
}

function CollisionDebug() { return null; }

// =========================================
// 4. MAIN APP
// =========================================
export default function App() {
  const gltf = useGLTF("/assets/museum24.glb");
  const scene = gltf.scene;
  
  const [painting, setPainting] = useState(null);
  
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  
  const joystickRef = useRef({ x: 0, y: 0 });
  const lookRef = useRef({ x: 0, y: 0 });
  const idleTimer = useRef(null);

  const resetIdleTimer = () => {
    if(showInstructions) setShowInstructions(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
        setShowInstructions(true);
    }, 10000); 
  };

  useEffect(() => {
      const startTimer = setTimeout(() => {
          setShowInstructions(true);
      }, 5000);
      return () => clearTimeout(startTimer);
  }, []);

  useEffect(() => {
    const checkLayout = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const mobileCheck = width < 1024 || 'ontouchstart' in window;
      setIsMobile(mobileCheck);
      setIsPortrait(mobileCheck && height > width);
    };

    window.addEventListener("resize", checkLayout);
    checkLayout(); 
    resetIdleTimer(); 

    return () => window.removeEventListener("resize", checkLayout);
  }, []);

  return (
    <>
      <GlobalStyles />

      <RotateDeviceOverlay isVisible={isPortrait} />
      
      <InstructionOverlay 
        isVisible={showInstructions && !isPortrait} 
        isMobile={isMobile} 
      />
      
      <InfoPanel activeMesh={painting} isMobile={isMobile} />

      {isMobile && !isPortrait && (
         <MobileControls 
            joystickRef={joystickRef} 
            lookRef={lookRef} 
            onInteract={resetIdleTimer}
         />
      )}

      {!isMobile && (
         <div style={{ position: "fixed", top: "50%", left: "50%", width: 6, height: 6, background: "white", borderRadius: "50%", transform: "translate(-50%,-50%)", zIndex: 1000, pointerEvents: 'none', opacity: 0.5 }} />
      )}

      <Canvas 
        camera={{ fov: 75 }} 
        style={{ width: "100vw", height: "100vh", background: "#111", touchAction: "none" }}
        onCreated={(state) => {
            state.gl.domElement.style.touchAction = "none";
        }}
      >
        <ambientLight intensity={1} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} />

        <Suspense fallback={null}>
            <FPSCamera 
                model={scene} 
                joystickRef={joystickRef} 
                lookRef={lookRef}
                onActive={resetIdleTimer} 
            />
            <Museum scene={scene} />
            <AutoSpotLights scene={scene} />
            <CollisionDebug scene={scene} />
            <LookAtPainting scene={scene} onChange={setPainting} />
        </Suspense>
      </Canvas>
    </>
  );
}