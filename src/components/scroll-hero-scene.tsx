"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowDownRight, ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";
import * as THREE from "three";

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum);

export function ScrollHeroScene() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    const copy = copyRef.current;
    const detail = detailRef.current;

    if (!section || !canvas || !copy || !detail) return;
    const root: HTMLElement = section;
    const sceneCanvas: HTMLCanvasElement = canvas;
    const heroCopy: HTMLDivElement = copy;
    const heroDetail: HTMLDivElement = detail;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: sceneCanvas, alpha: true, antialias: true });
    } catch {
      root.dataset.sceneMode = "fallback";
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0, 7.4);

    const group = new THREE.Group();
    scene.add(group);

    const frameMaterial = new THREE.MeshBasicMaterial({
      color: "#f9f4ec",
      transparent: true,
      opacity: 0.96,
    });
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(5.82, 3.62), frameMaterial);
    frame.position.set(1.05, -0.02, -0.08);
    group.add(frame);

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(5.95, 3.76),
      new THREE.MeshBasicMaterial({ color: "#233d34", transparent: true, opacity: 0.12 }),
    );
    shadow.position.set(1.18, -0.18, -0.19);
    group.add(shadow);

    const imageMaterial = new THREE.MeshBasicMaterial({
      color: "#e7e0d8",
      transparent: true,
      opacity: 0,
    });
    const image = new THREE.Mesh(new THREE.PlaneGeometry(5.46, 3.07), imageMaterial);
    image.position.set(1.05, -0.02, 0);
    group.add(image);

    const sheen = new THREE.Mesh(
      new THREE.PlaneGeometry(5.46, 3.07),
      new THREE.MeshBasicMaterial({ color: "#fffaf4", transparent: true, opacity: 0.12 }),
    );
    sheen.position.set(1.05, -0.02, 0.012);
    group.add(sheen);

    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(
      "/betterself-hero-home.jpg",
      (loadedTexture) => {
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        loadedTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        imageMaterial.map = loadedTexture;
        imageMaterial.opacity = 1;
        imageMaterial.needsUpdate = true;
        root.dataset.sceneMode = "ready";
      },
      undefined,
      () => {
        root.dataset.sceneMode = "fallback";
      },
    );

    let progressTarget = 0;
    let progress = 0;
    let frameId = 0;
    let visible = true;
    const clock = new THREE.Clock();

    function layout() {
      const width = root.clientWidth;
      const height = root.clientHeight;
      const compact = width < 768;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.fov = compact ? 39 : 34;
      camera.updateProjectionMatrix();

      const scale = compact ? 0.84 : width < 1120 ? 0.93 : 1;
      group.scale.setScalar(scale);
      group.position.set(compact ? 0.02 : 0, compact ? -0.18 : 0, 0);
    }

    function updateProgress() {
      const scrollDistance = Math.max(root.offsetHeight - window.innerHeight, 1);
      progressTarget = clamp(-root.getBoundingClientRect().top / scrollDistance, 0, 1);
    }

    function render() {
      if (!visible) {
        frameId = window.requestAnimationFrame(render);
        return;
      }

      progress += (progressTarget - progress) * 0.075;
      const time = clock.getElapsedTime();
      const breathe = reduceMotion ? 0 : Math.sin(time * 0.42) * 0.018;
      const turn = -0.14 + progress * 0.38 + breathe;

      group.rotation.set(-0.025 + progress * 0.07, turn, -0.015 - progress * 0.035);
      group.position.x = (window.innerWidth < 768 ? 0.02 : 0) - progress * 0.54;
      group.position.y = (window.innerWidth < 768 ? -0.18 : 0) + progress * 0.28;
      camera.position.x = progress * -0.22;
      camera.position.y = progress * 0.08;
      camera.lookAt(0.45 - progress * 0.28, 0.02, 0);

      const copyOpacity = 1 - clamp(progress * 1.55, 0, 0.94);
      heroCopy.style.opacity = String(copyOpacity);
      heroCopy.style.transform = `translate3d(0, ${progress * -56}px, 0)`;
      heroDetail.style.opacity = String(clamp((progress - 0.15) * 1.5, 0, 1));
      heroDetail.style.transform = `translate3d(0, ${(1 - clamp((progress - 0.15) * 1.5, 0, 1)) * 22}px, 0)`;

      try {
        renderer.render(scene, camera);
      } catch {
        root.dataset.sceneMode = "fallback";
        renderer.dispose();
        return;
      }
      frameId = window.requestAnimationFrame(render);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0.02 },
    );

    layout();
    updateProgress();
    observer.observe(root);
    window.addEventListener("resize", layout, { passive: true });
    window.addEventListener("scroll", updateProgress, { passive: true });
    frameId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("resize", layout);
      window.removeEventListener("scroll", updateProgress);
      texture.dispose();
      image.geometry.dispose();
      frame.geometry.dispose();
      shadow.geometry.dispose();
      sheen.geometry.dispose();
      imageMaterial.dispose();
      frameMaterial.dispose();
      (shadow.material as THREE.Material).dispose();
      (sheen.material as THREE.Material).dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <section ref={sectionRef} className="scroll-hero" aria-label="BetterSelf introduction">
      <div className="scroll-hero-stage">
        <Image
          className="scroll-hero-fallback"
          src="/betterself-hero-home.jpg"
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="100vw"
        />
        <canvas ref={canvasRef} className="scroll-hero-canvas" aria-hidden="true" />
        <div className="scroll-hero-grain" aria-hidden="true" />

        <div className="scroll-hero-content" ref={copyRef}>
          <p className="eyebrow">BetterSelf Home Aesthetics</p>
          <h1>Beauty, brought to your private space.</h1>
          <p className="scroll-hero-intro">
            Doctor-led aesthetic care for Metro Manila, with a clear medical process and the privacy of home.
          </p>
          <div className="scroll-hero-actions">
            <Link className="premium-cta" href="/booking">
              Book a treatment
            </Link>
            <Link className="editorial-text-link" href="/treatments">
              Explore treatments <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="scroll-hero-detail" ref={detailRef} aria-hidden="true">
          <span>Private care</span>
          <i />
          <span>Prepared with intention</span>
        </div>

        <div className="scroll-hero-scroll" aria-hidden="true">
          <span>Scroll to discover</span>
          <ArrowDownRight className="h-4 w-4" />
        </div>
      </div>
    </section>
  );
}
