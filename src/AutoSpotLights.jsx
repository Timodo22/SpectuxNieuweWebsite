import { useEffect, useState, useMemo } from "react";
import * as THREE from "three";

export default function AutoSpotLights({ scene }) {
  // =========================================
  // 1. DE STANDAARD PLAFOND LAMPEN (Blijft hetzelfde)
  // =========================================
  const [lampPositions, setLampPositions] = useState([]);

  useEffect(() => {
    const lamps = [];
    scene.traverse((obj) => {
      if (obj.isObject3D && obj.name.startsWith("LightParent|SpotTemplate|Dupli")) {
        const world = new THREE.Vector3();
        obj.getWorldPosition(world);
        lamps.push(world);
      }
    });
    setLampPositions(lamps);
  }, [scene]);

  const autoTargets = useMemo(() => {
    return lampPositions.map(() => new THREE.Object3D());
  }, [lampPositions]);


  // =========================================
  // 2. JOUW CLUSTER VAN 4 LAMPEN
  // =========================================
  
  // A. DE STARTPOSITIE (Alle 4 de lampen hangen hier)
  const startPos = [0, 5, 0]; 

  // B. DE INSTELLINGEN PER LAMP
  // Hier maak je een lijstje van de richtingen.
  // x = links/rechts offset
  // z = voor/achter offset
  const spotConfigs = [
    { x: 6,   z: -0.6 }, // Lamp 1: Jouw originele (Rechts)
    { x: -6,  z: +0.6 }, // Lamp 2: Precies de andere kant op (Links)
    { x: 0.5,   z: 6    }, // Lamp 3: Naar voren
    { x: -0.5,   z: -6   }  // Lamp 4: Naar achteren
  ];

  // We maken automatisch 4 targets aan (voor elke regel hierboven één)
  const customTargets = useMemo(() => {
    return spotConfigs.map(() => new THREE.Object3D());
  }, []); // Lege dependency array, targets worden 1x gemaakt

  return (
    <group>
      {/* --- DE STANDAARD PLAFOND LAMPEN --- */}
      {lampPositions.map((pos, i) => {
        const target = autoTargets[i];
        target.position.set(pos.x, 0, pos.z); 
        target.updateMatrixWorld();
        return (
          <group key={i}>
            <spotLight
              position={[pos.x, pos.y - 0.2, pos.z]}
              intensity={5} 
              distance={15}
              angle={0.95}
              penumbra={0.5}
              color={"#fffaea"}
              castShadow={false}
              target={target}
            />
            <primitive object={target} />
          </group>
        );
      })}

      {/* --- JOUW 4 CUSTOM LAMPEN --- */}
      {spotConfigs.map((config, i) => {
        const target = customTargets[i];
        
        // Bereken waar deze specifieke lamp naar moet kijken
        // Startpositie - 5 meter omlaag + de offset uit het lijstje
        target.position.set(
            startPos[0] + config.x,
            startPos[1] - 5, 
            startPos[2] + config.z
        );
        target.updateMatrixWorld();

        return (
          <group key={`custom-spot-${i}`}>
            <spotLight
              position={startPos} // Ze komen allemaal uit hetzelfde punt
              target={target}     // Maar kijken naar hun eigen target
              
              intensity={60}      // Pas hier de sterkte aan voor ALLE 4
              distance={20}
              angle={0.3}         // De spot grootte
              penumbra={0.1}
              color={"#fffaea"}
              castShadow={false}
            />
            
            {/* Het target renderen */}
            <primitive object={target} />
            
            {/* Debug Hulpje: (haal weg als je klaar bent) */}
            {/* <mesh position={target.position}>
                <sphereGeometry args={[0.1]} />
                <meshBasicMaterial color="red" />
            </mesh> */}
          </group>
        );
      })}

    </group>
  );
}