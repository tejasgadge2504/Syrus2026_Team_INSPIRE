import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";

export default function ModelRenderer({ jewelryJSON, selectedId, setSelectedId }) {

  const mountRef = useRef();
  const meshMap = useRef({});

  useEffect(() => {

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f5e6b3");

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    const renderer = new THREE.WebGLRenderer({ antialias:true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableZoom = false;

    const ambient = new THREE.AmbientLight(0xffffff,0.8);
    scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff,0.7);
    dir.position.set(5,10,7);
    scene.add(dir);

    const objLoader = new OBJLoader();

    // ----- CREATE COMPONENTS -----

    jewelryJSON.components.forEach(comp=>{

      const isGem = comp.type==="gem" || comp.type==="diamond";

      const material = isGem
        ? new THREE.MeshPhysicalMaterial({
            color: comp.materialOverrides?.color || "#ffffff",
            transmission:1,
            roughness:0,
            metalness:0,
            ior:2.4
          })
        : new THREE.MeshStandardMaterial({
            color: comp.materialOverrides?.color || "#bfa14a",
            metalness:1,
            roughness:0.25
          });

      if(comp.model_path){

        const url=`http://localhost:5000/${comp.model_path}`;

        objLoader.load(url,(obj)=>{

          obj.traverse(child=>{
            if(child.isMesh){

              child.material=material;
              child.userData.componentId=comp.id;

              meshMap.current[comp.id]=child;
            }
          });

          obj.position.set(...(comp.transform?.position||[0,0,0]));

          const s=comp.transform?.scale||1;
          obj.scale.set(s,s,s);

          scene.add(obj);

        });

      } else {

        let geo=null;

        if(comp.geometry?.type==="torus"){
          geo=new THREE.TorusGeometry(
            comp.geometry.radius||1,
            comp.geometry.tube||0.2,
            16,
            32
          );
        }

        if(!geo) return;

        const mesh=new THREE.Mesh(geo,material);

        mesh.userData.componentId=comp.id;

        mesh.position.set(...(comp.transform?.position||[0,0,0]));

        const s=comp.transform?.scale||1;
        mesh.scale.set(s,s,s);

        scene.add(mesh);

        meshMap.current[comp.id]=mesh;
      }

    });

    // ----- AUTO CAMERA FIT -----

    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3()).length();

    camera.position.set(0, size*0.6, size*1.2);
    camera.lookAt(0,0,0);

    // ----- SELECTION -----

    const raycaster=new THREE.Raycaster();
    const mouse=new THREE.Vector2();

    renderer.domElement.addEventListener("click",(event)=>{

      mouse.x=(event.clientX/window.innerWidth)*2-1;
      mouse.y=-(event.clientY/window.innerHeight)*2+1;

      raycaster.setFromCamera(mouse,camera);

      const objects=Object.values(meshMap.current);

      const intersects=raycaster.intersectObjects(objects,true);

      if(intersects.length){

        const id=intersects[0].object.userData.componentId;

        setSelectedId(id);
      }

    });

    // ----- RENDER LOOP -----

    const animate=()=>{

      requestAnimationFrame(animate);

      Object.values(meshMap.current).forEach(mesh=>{

        if(mesh.userData.componentId===selectedId){

          mesh.material.emissive=new THREE.Color("#444444");

        }else{

          if(mesh.material.emissive)
            mesh.material.emissive.set("#000000");
        }

      });

      controls.update();

      renderer.render(scene,camera);

    };

    animate();

  },[jewelryJSON,selectedId]);

  return <div ref={mountRef} style={{flex:1}} />;
}