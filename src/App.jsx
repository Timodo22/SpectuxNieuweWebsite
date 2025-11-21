// App.jsx

import React, { Suspense, useState, useEffect, useRef } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

import FPSCamera from "./ScrollCamera";
import AutoSpotLights from "./AutoSpotLights";

// =========================================
// KLEUR DEFINITIE (Roze/Paars)
// =========================================
const THEME_COLOR = "#FF00CC"; // rgb(255, 0, 204)

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
  "PaitingsInside_Painting.008": {
    title: "Sport Loterij",
    description: "Een gedetailleerde weergave van de website van de sport loterij.",
    image: "/assets/sport_preview.jpg",
  },
  "PaitingsInside_Painting_0014": {
    title: "AVANT Logistics",
    description: "De website van AVANT Logistics.",
    image: "/assets/avant_preview.jpg",
  },
  "PaitingsInside_Painting.001": {
    title: "Interieur Design",
    description: "Een zachte weergave van een interieur project.",
    image: "/assets/design_preview.jpg",
  },
};

// =========================================
// 2. UI COMPONENTS
// =========================================

// --- A. Instructie Overlay ---
function InstructionOverlay({ isVisible, isMobile }) {
  return (
    <div style={{
      position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)",
      background: "rgba(0, 0, 0, 0.8)", color: "white", padding: "15px 25px",
      borderRadius: "30px", textAlign: "center",
      opacity: isVisible ? 1 : 0, transition: "opacity 0.5s ease",
      pointerEvents: "none", zIndex: 20, width: isMobile ? "90%" : "auto",
      border: `1px solid ${THEME_COLOR}`,
      boxShadow: `0 0 10px ${THEME_COLOR}`
    }}>
      <h3 style={{ margin: "0 0 5px 0", fontSize: "16px", color: THEME_COLOR, textTransform: "uppercase" }}>
        Welkom in het Museum
      </h3>
      <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.4" }}>
        {isMobile 
          ? <span>Links: <b>Lopen</b> &nbsp;|&nbsp; Rechts: <b>Rondkijken</b></span>
          : "Gebruik W A S D om rond te lopen en je MUIS om rond te kijken."}
      </p>
    </div>
  );
}

// --- B. Rotate Device Overlay (AANGEPAST) ---
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
      {/* LOGO PLACEHOLDER */}
      <div style={{ 
          width: "80px", height: "80px", background: THEME_COLOR, 
          borderRadius: "50%", marginBottom: "20px", display: 'flex', 
          alignItems: 'center', justifyContent: 'center', fontSize: '30px', fontWeight: 'bold'
      }}>
        M
      </div>

      <div style={{ fontSize: "50px", marginBottom: "15px", animation: "spin 4s infinite linear" }}>⟳</div>
      <h2 style={{ fontSize: "24px", margin: "0 0 10px 0", color: THEME_COLOR }}>Draai je scherm</h2>
      <p style={{ fontSize: "16px", color: "#ccc", maxWidth: "300px", lineHeight: "1.5" }}>
        Deze ervaring werkt het beste in liggende modus (Landscape).
      </p>
      
      <style>{`
        @keyframes spin { 100% { transform: rotate(90deg); } }
      `}</style>
    </div>
  );
}

// --- C. Info Panel (AANGEPAST: Mobiel Vriendelijk) ---
function InfoPanel({ activeMesh, isMobile }) {
  const paintingId = activeMesh ? activeMesh.userData.paintingId : null;
  const data = paintingId ? PAINTING_DATA[paintingId] : null;
  
  const content = data || { 
    title: paintingId || "Onbekend", 
    description: "Geen data gevonden voor dit ID.", 
    image: null 
  };
  
  const visible = !!activeMesh;

  // Mobiele layout aanpassingen
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
        
        {/* TEKST DEEL */}
        <div style={{
          background: "rgba(10, 10, 10, 0.95)", color: "white", padding: "20px",
          borderRadius: isMobile ? "0 0 15px 15px" : "15px 0 0 15px", 
          width: isMobile ? "100%" : "320px", 
          borderLeft: isMobile ? "none" : `4px solid ${THEME_COLOR}`,
          borderTop: isMobile ? `4px solid ${THEME_COLOR}` : "none",
          boxSizing: 'border-box',
          order: isMobile ? 2 : 1 // Op mobiel tekst onder afbeelding
        }}>
          <h2 style={{ margin: "0 0 8px 0", fontSize: isMobile ? "18px" : "22px", fontWeight: "bold", color: THEME_COLOR }}>
            {content.title}
          </h2>
          <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.5", color: "#ddd" }}>
            {content.description}
          </p>
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

// --- D. Mobile Controls (AANGEPAST: Visuele Indicator Rechts) ---
function MobileControls({ joystickRef, lookRef, onInteract }) {
  // 1. JOYSTICK LOGICA (Links)
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

  // 2. TOUCH LOOK LOGICA (Rechts)
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
      {/* LINKER KANT: Joystick Zone */}
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
                width: 50, height: 50, background: THEME_COLOR, borderRadius: '50%', opacity: 0.8,
                position: 'absolute', top: '50%', left: '50%', marginTop: -25, marginLeft: -25, pointerEvents: 'none',
                boxShadow: `0 0 15px ${THEME_COLOR}`
            }} />
         </div>
      </div>

      {/* RECHTER KANT: Look Visual Indicator + Zone */}
      {/* De Indicator (Het Oogje) */}
      <div style={{
          position: 'fixed', bottom: 85, right: 75, zIndex: 48, pointerEvents: 'none', opacity: 0.6,
          display: 'flex', flexDirection: 'column', alignItems: 'center'
      }}>
          <div style={{ 
              width: 50, height: 50, border: '2px solid white', borderRadius: '50%', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.3)'
          }}>
            {/* Simpel oog icoontje in CSS */}
            <div style={{ width: 20, height: 20, background: THEME_COLOR, borderRadius: '50%' }} />
          </div>
          <div style={{ color: 'white', fontSize: '10px', marginTop: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>Kijken</div>
      </div>

      {/* De Onzichtbare Zone over de hele rechterkant */}
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
  // AANGEPAST: Start op false, komt na 5 seconden
  const [showInstructions, setShowInstructions] = useState(false);
  
  const joystickRef = useRef({ x: 0, y: 0 });
  const lookRef = useRef({ x: 0, y: 0 });
  const idleTimer = useRef(null);

  // Timer Logic: Reset bij interactie, toon na 10s inactiviteit
  const resetIdleTimer = () => {
    if(showInstructions) setShowInstructions(false);
    
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
        setShowInstructions(true);
    }, 10000); 
  };

  // Initial Startup Timer (5 seconde vertraging voor eerste bericht)
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
    
    // Start de idle timer loop
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