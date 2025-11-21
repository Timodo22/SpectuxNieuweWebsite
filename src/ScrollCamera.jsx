// ScrollCamera.jsx

import { useThree, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

const SPEED = 3.0;
const SENS = 0.002; // Muis gevoeligheid
const TOUCH_LOOK_SENS = 0.010; // Touch gevoeligheid
const HEIGHT = 1.7;
const RADIUS = 0.5;

// --- LOOP EFFECT INSTELLINGEN (HEAD BOB) ---
const BOB_SPEED = 12;       // Frequentie van de stappen
const BOB_AMPLITUDE = 0.06; // Hoe hoog het hoofd op en neer gaat

export default function FPSCamera({ 
  model, 
  start = [0, HEIGHT, 2], 
  joystickRef,    
  lookRef,        
  onActive        
}) {
  const { camera, gl, scene } = useThree();

  const yaw = useRef(new THREE.Object3D());
  const pitch = useRef(new THREE.Object3D());
  const keys = useRef({});
  const colliderPos = useRef(new THREE.Vector3(...start));
  
  // Timer voor het loop-effect
  const bobTimer = useRef(0);

  const obstacles = useRef([]);
  const raycaster = useRef(new THREE.Raycaster());

  // 1. Verzamel obstakels
  useEffect(() => {
    const list = [];
    if(model) {
        model.traverse((obj) => {
          if (!obj.isMesh) return;
          if (obj.name.includes("Ceil") || obj.name.includes("Floor") || obj.name.includes("Emissive")) return;
          if (obj.name.startsWith("Walls_") || obj.name.startsWith("Bench_")) {
            list.push(obj);
          }
        });
    }
    obstacles.current = list;
  }, [model]);

  // 2. Controls Setup
  useEffect(() => {
    camera.position.set(0, 0, 0);
    pitch.current.add(camera);
    yaw.current.position.copy(colliderPos.current);
    yaw.current.add(pitch.current);
    scene.add(yaw.current);

    const canvas = gl.domElement;
    
    const onClick = () => {
        if(!('ontouchstart' in window)) {
            canvas.requestPointerLock();
        }
    };
    canvas.addEventListener("click", onClick);

    const onMouseMove = (e) => {
      if (document.pointerLockElement !== canvas) return;
      
      yaw.current.rotation.y -= e.movementX * SENS;
      pitch.current.rotation.x -= e.movementY * SENS;
      pitch.current.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch.current.rotation.x));
      
      if (onActive) onActive();
    };

    window.addEventListener("mousemove", onMouseMove);
    
    const down = (e) => { keys.current[e.code] = true; if(onActive) onActive(); };
    const up = (e) => { keys.current[e.code] = false; if(onActive) onActive(); };
    
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      canvas.removeEventListener("click", onClick);
    };
  }, [camera, gl, scene, onActive]);

  // 3. Raycast Check
  function canMove(currentPos, directionVector) {
    const checkHeights = [0.2, 1.5]; 
    for (let y of checkHeights) {
        const origin = currentPos.clone();
        origin.y = y; 
        raycaster.current.set(origin, directionVector);
        const intersects = raycaster.current.intersectObjects(obstacles.current);
        if (intersects.length > 0 && intersects[0].distance < RADIUS) {
            return false;
        }
    }
    return true;
  }

  // 4. Game Loop
  useFrame((_, delta) => {
    // A. Touch Look
    if (lookRef && (lookRef.current.x !== 0 || lookRef.current.y !== 0)) {
        yaw.current.rotation.y -= lookRef.current.x * TOUCH_LOOK_SENS;
        pitch.current.rotation.x -= lookRef.current.y * TOUCH_LOOK_SENS;
        pitch.current.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch.current.rotation.x));
        
        lookRef.current = { x: 0, y: 0 };
        if (onActive) onActive();
    }

    const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, yaw.current.rotation.y, 0));
    const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, yaw.current.rotation.y, 0));

    const moveDir = new THREE.Vector3(0, 0, 0);

    // C. Inputs
    if (keys.current["KeyW"]) moveDir.add(forward);
    if (keys.current["KeyS"]) moveDir.sub(forward);
    if (keys.current["KeyA"]) moveDir.sub(right);
    if (keys.current["KeyD"]) moveDir.add(right);

    if (joystickRef && (joystickRef.current.x !== 0 || joystickRef.current.y !== 0)) {
        const jY = joystickRef.current.y; 
        const jX = joystickRef.current.x;

        if (jY > 0) moveDir.add(forward.clone().multiplyScalar(jY));
        else if (jY < 0) moveDir.add(forward.clone().multiplyScalar(jY));

        if (jX !== 0) moveDir.add(right.clone().multiplyScalar(jX));
        
        if (onActive) onActive();
    }

    // D. Physics & Head Bobbing
    if (moveDir.lengthSq() > 0) {
      const displacement = moveDir.normalize().multiplyScalar(SPEED * delta);

      // 1. Bewegen X
      const dirX = new THREE.Vector3(displacement.x, 0, 0).normalize();
      if (Math.abs(displacement.x) > 0.001) {
         if (canMove(colliderPos.current, dirX)) colliderPos.current.x += displacement.x;
      }

      // 2. Bewegen Z
      const dirZ = new THREE.Vector3(0, 0, displacement.z).normalize();
      if (Math.abs(displacement.z) > 0.001) {
         if (canMove(colliderPos.current, dirZ)) colliderPos.current.z += displacement.z;
      }

      // 3. Head Bobbing (Simulatie van lopen)
      bobTimer.current += delta * BOB_SPEED;
      yaw.current.position.y = HEIGHT + Math.sin(bobTimer.current) * BOB_AMPLITUDE;

    } else {
      // Als je stilstaat, ga soepel terug naar normale hoogte
      yaw.current.position.y = THREE.MathUtils.lerp(yaw.current.position.y, HEIGHT, 0.1);
      bobTimer.current = 0; // Reset timer
    }

    // Update de positie
    yaw.current.position.x = colliderPos.current.x;
    yaw.current.position.z = colliderPos.current.z;
  });

  return null;
}