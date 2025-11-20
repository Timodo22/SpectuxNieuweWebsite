// App.jsx

import React, { Suspense, useState, useEffect, useRef } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

import FPSCamera from "./ScrollCamera";
import AutoSpotLights from "./AutoSpotLights";

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
      background: "rgba(0, 0, 0, 0.6)", color: "white", padding: "15px 25px",
      borderRadius: "30px", fontFamily: "sans-serif", textAlign: "center",
      opacity: isVisible ? 1 : 0, transition: "opacity 0.5s ease",
      pointerEvents: "none", zIndex: 20, width: isMobile ? "80%" : "auto"
    }}>
      <h3 style={{ margin: "0 0 5px 0", fontSize: "16px", color: "#ffae00" }}>Welkom in het Museum</h3>
      <p style={{ margin: 0, fontSize: "14px" }}>
        {isMobile 
          ? "Gebruik de LINKER joystick om te lopen. Sleep RECHTS om te kijken."
          : "Gebruik W A S D om rond te lopen en je MUIS om rond te kijken."}
      </p>
      <p style={{ margin: "5px 0 0 0", fontSize: "12px", color: "#ccc" }}>
        <i>Tip: Ga naar een schilderij om informatie te bekijken!</i>
      </p>
    </div>
  );
}

// --- B. Rotate Device Overlay (voor portrait mode) ---
function RotateDeviceOverlay({ isVisible }) {
  if (!isVisible) return null;
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
      background: "#111", color: "white", zIndex: 9999,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "sans-serif", textAlign: "center", padding: "20px"
    }}>
      <div style={{ fontSize: "60px", marginBottom: "20px" }}>📱 ➔ 🔄</div>
      <h2>Draai je apparaat</h2>
      <p>Voor de beste ervaring, draai je telefoon of tablet 90 graden (Landscape).</p>
    </div>
  );
}

// --- C. Info Panel (Schilderijen) ---
function InfoPanel({ activeMesh }) {
  const paintingId = activeMesh ? activeMesh.userData.paintingId : null;
  const data = paintingId ? PAINTING_DATA[paintingId] : null;
  
  const content = data || { 
    title: paintingId || "Onbekend", 
    description: "Geen data gevonden voor dit ID.", 
    image: null 
  };
  
  const visible = !!activeMesh;

  return (
    <div style={styles.overlayContainer}>
      <div style={{ 
        ...styles.panelWrapper, 
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        pointerEvents: visible ? "auto" : "none"
      }}>
        <div style={styles.textCard}>
          <h2 style={styles.title}>{content.title}</h2>
          <p style={styles.desc}>{content.description}</p>
        </div>
        <div style={{
           ...styles.imageCard,
           transform: visible ? "translateX(0)" : "translateX(-100%)",
           opacity: visible ? 1 : 0,
        }}>
          {content.image && <img src={content.image} alt="Art" style={styles.img} />}
        </div>
      </div>
    </div>
  );
}

// --- D. Mobile Controls (Joystick + Touch Look) ---
function MobileControls({ joystickRef, lookRef, onInteract }) {
  // Joystick Logic
  const stickRef = useRef();
  const baseRef = useRef();
  
  const handleStickStart = (e) => {
    onInteract();
    // Basis logica voor joystick start...
  };

  const handleStickMove = (e) => {
    onInteract();
    const touch = e.targetTouches[0];
    const baseRect = baseRef.current.getBoundingClientRect();
    const centerX = baseRect.left + baseRect.width / 2;
    const centerY = baseRect.top + baseRect.height / 2;

    const maxDist = baseRect.width / 2;
    
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    // Clamp
    if(dist > maxDist) {
        dx = (dx / dist) * maxDist;
        dy = (dy / dist) * maxDist;
    }

    // Visual update
    stickRef.current.style.transform = `translate(${dx}px, ${dy}px)`;

    // Data update (Normalized -1 to 1)
    // Invert DY because up on screen is negative Y
    joystickRef.current = { x: dx / maxDist, y: -(dy / maxDist) };
  };

  const handleStickEnd = () => {
    stickRef.current.style.transform = `translate(0px, 0px)`;
    joystickRef.current = { x: 0, y: 0 };
  };

  // Touch Look Logic (Rechterkant scherm)
  const lastTouch = useRef({ x: 0, y: 0 });

  const handleLookStart = (e) => {
    onInteract();
    lastTouch.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
  };

  const handleLookMove = (e) => {
    onInteract();
    const x = e.targetTouches[0].clientX;
    const y = e.targetTouches[0].clientY;
    
    const deltaX = x - lastTouch.current.x;
    const deltaY = y - lastTouch.current.y;

    lookRef.current = { x: deltaX, y: deltaY };
    lastTouch.current = { x, y };
  };

  return (
    <>
      {/* LINKER KANT: Joystick Zone */}
      <div style={{ position: 'fixed', bottom: 40, left: 40, width: 120, height: 120, zIndex: 50 }}>
         <div ref={baseRef} 
              onTouchStart={handleStickStart} onTouchMove={handleStickMove} onTouchEnd={handleStickEnd}
              style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', position: 'relative', border: '2px solid rgba(255,255,255,0.3)' }}>
            <div ref={stickRef} style={{ 
                width: 50, height: 50, background: 'rgba(255, 174, 0, 0.8)', borderRadius: '50%', 
                position: 'absolute', top: '50%', left: '50%', marginTop: -25, marginLeft: -25, pointerEvents: 'none'
            }} />
         </div>
      </div>

      {/* RECHTER KANT: Look Zone (Onzichtbare overlay op rechter helft scherm) */}
      <div 
        onTouchStart={handleLookStart}
        onTouchMove={handleLookMove}
        style={{ 
            position: 'fixed', top: 0, right: 0, width: '50vw', height: '100vh', 
            zIndex: 49, /* Net onder UI */
            // background: 'rgba(0,255,0,0.1)' // Zet aan om zone te zien voor debug
        }} 
      />
    </>
  );
}


const styles = {
  overlayContainer: {
    position: "fixed", bottom: "50px", left: 0, width: "100%",
    display: "flex", justifyContent: "center", alignItems: "flex-end",
    zIndex: 10, pointerEvents: "none", 
  },
  panelWrapper: {
    display: "flex", alignItems: "stretch", height: "180px",
    transition: "all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)",
  },
  textCard: {
    background: "rgba(10, 10, 10, 0.9)", color: "white", padding: "25px",
    borderRadius: "12px 0 0 12px", width: "320px", borderLeft: "4px solid #ffae00",
    zIndex: 2, display: "flex", flexDirection: "column", justifyContent: "center"
  },
  imageCard: {
    background: "rgba(255, 255, 255, 0.1)", padding: "10px", borderRadius: "0 12px 12px 0",
    width: "260px", zIndex: 1, display: "flex", position: "relative", overflow: "hidden",
    transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)", transitionDelay: "0.1s", 
  },
  title: { margin: "0 0 10px 0", fontSize: "22px", fontFamily: "sans-serif", fontWeight: "bold" },
  desc: { margin: 0, fontSize: "14px", lineHeight: "1.6", fontFamily: "sans-serif", color: "#ccc" },
  img: { width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" },
};

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
  const gltf = useGLTF("/assets/museum6.glb");
  const scene = gltf.scene;
  
  const [painting, setPainting] = useState(null);
  
  // State voor device & overlay
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  
  // Refs voor Mobile Controls (worden doorgegeven aan Camera)
  const joystickRef = useRef({ x: 0, y: 0 });
  const lookRef = useRef({ x: 0, y: 0 });
  
  // Timer Logic
  const idleTimer = useRef(null);

  const resetIdleTimer = () => {
    // Verberg overlay zodra er actie is
    setShowInstructions(false);
    
    // Reset de timer
    if (idleTimer.current) clearTimeout(idleTimer.current);
    
    // Zet nieuwe timer voor 10 seconden
    idleTimer.current = setTimeout(() => {
        setShowInstructions(true);
    }, 10000); // 10000ms = 10s
  };

  useEffect(() => {
    // Device Detection
    const checkLayout = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      // Simpele check: Mobiel/Tablet is vaak smaller dan 1024 of touch enabled
      const mobileCheck = width < 1024 || 'ontouchstart' in window;
      setIsMobile(mobileCheck);
      
      // Check Portrait alleen relevant op mobile/tablet
      if (mobileCheck && height > width) {
        setIsPortrait(true);
      } else {
        setIsPortrait(false);
      }
    };

    window.addEventListener("resize", checkLayout);
    checkLayout(); // Initieel
    resetIdleTimer(); // Start de idle timer meteen

    return () => window.removeEventListener("resize", checkLayout);
  }, []);

  return (
    <>
      {/* 1. De Overlays */}
      <RotateDeviceOverlay isVisible={isPortrait} />
      
      <InstructionOverlay 
        isVisible={showInstructions && !isPortrait} 
        isMobile={isMobile} 
      />
      
      <InfoPanel activeMesh={painting} />

      {/* 2. Mobile Controls (Alleen als landscape + mobile) */}
      {isMobile && !isPortrait && (
         <MobileControls 
            joystickRef={joystickRef} 
            lookRef={lookRef} 
            onInteract={resetIdleTimer}
         />
      )}

      {/* 3. Vizier puntje in midden */}
      {!isMobile && (
         <div style={{ position: "fixed", top: "50%", left: "50%", width: 6, height: 6, background: "white", borderRadius: "50%", transform: "translate(-50%,-50%)", zIndex: 1000, pointerEvents: 'none', opacity: 0.5 }} />
      )}

      {/* 4. 3D Scene */}
      <Canvas 
        camera={{ fov: 75 }} 
        style={{ width: "100vw", height: "100vh", background: "#111" }}
        // Belangrijk voor touch actions op canvas te voorkomen (scrollen etc)
        onCreated={(state) => {
            state.gl.domElement.style.touchAction = "none";
        }}
      >
        <ambientLight intensity={1} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} />

        <Suspense fallback={null}>
            {/* Geef refs en interact callback door aan camera */}
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