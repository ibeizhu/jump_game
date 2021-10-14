import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils';
import { animation } from './lib';

class LittleMan {
  constructor({ world, canvas, stage, props, height, width, color = 0x386899 }) {
    this.stage = stage;
    this.props = props;
    this.canvas = canvas;
    this.height = height;
    this.width = width;
    this.world = world;
    this.color = color;
    this.isJumping = false;
    this.jumpAngle = Math.PI / 4;
    this.strength = 0;
    this.headerHeight = width * 0.25;
    this.G = 9.8;
    this.ratio = 1;
    this.currentLittleManPosition = null;
    this.animationFrameId = null;
    this.littleManMesh = null;
    this.littleManmaterial = null;
  }
  createLittleMan() {
    const { color } = this;
    this.material = new THREE.MeshStandardMaterial({ color });
    const littleManMesh = (this.littleManMesh = new THREE.Group());
    this.createLittleManHeader();
    this.createLittleManBody();
    return littleManMesh;
  }

  createLittleManHeader() {
    const { width, material, littleManMesh, headerHeight } = this;
    const headerGeo = new THREE.SphereGeometry(width * 0.04, 50, 50);
    const headerMesh = (this.headerMesh = new THREE.Mesh(headerGeo, material));
    headerMesh.position.set(0, 0, headerHeight);
    headerMesh.castShadow = true;
    littleManMesh.add(headerMesh);
  }

  createLittleManBody() {
    const { width, height, material, littleManMesh, stage } = this;
    const bodyBottomGeo = new THREE.CylinderGeometry(width * 0.03, width * 0.06, Math.floor((width * 3) / 21), 50, 50);
    bodyBottomGeo.translate(0, Math.floor((width * 3) / 42), 0);
    const bodyMidGeo = new THREE.CylinderGeometry(width * 0.04, width * 0.03, Math.floor(width / 21), 50, 50);
    bodyMidGeo.translate(0, Math.floor((width * 3) / 21), 0);
    const bodyTopGeo = new THREE.SphereGeometry(width * 0.04, 50, 50);
    bodyTopGeo.translate(0, Math.floor((width * 3) / 18), 0);
    const bodyGeometry = (this.bodyGeometry = BufferGeometryUtils.mergeBufferGeometries(
      [bodyTopGeo, bodyMidGeo, bodyBottomGeo],
      false
    ));
    bodyGeometry.rotateX(Math.PI / 2);
    const bodyMesh = (this.bodyMesh = new THREE.Mesh(bodyGeometry, material));
    bodyMesh.castShadow = true;
    const box = new THREE.Box3();
    const size = new THREE.Vector3();
    box.setFromObject(bodyMesh).getSize(size);
    this.littleManBodyHeight = size?.z || 0;
    littleManMesh.add(bodyMesh);
    stage.render();
  }

  enterStage() {
    const { stage, props } = this;
    const { littleManMesh, headerMesh, bodyMesh } = this;
    // bodyMesh.position.z = bodyMesh.position.z + props.getPropHeight();
    // headerMesh.position.z = headerMesh.position.z + props.getPropHeight();
    littleManMesh.position.z = props.getPropHeight();
    stage.add(littleManMesh);
    {
      const bodybox = new THREE.Box3().setFromObject(bodyMesh);
      const headerbox = new THREE.Box3().setFromObject(headerMesh);
      const manbox = new THREE.Box3().setFromObject(littleManMesh);
      const bodyhelper = new THREE.Box3Helper(bodybox, 0xffff00);
      const headerhelper = new THREE.Box3Helper(headerbox, 'red');
      const manhelper = new THREE.Box3Helper(manbox, 'green');
      stage.add(bodyhelper);
      stage.add(headerhelper);
      stage.add(manhelper);
      console.log(bodyMesh.position);
      console.log(headerMesh.position);
      console.log(littleManMesh.position);
    }
    this.bindEvent();
    stage.render();
  }

  pressLittleMan() {
    const { littleManMesh, bodyMesh, headerMesh, ratio, props, headerHeight } = this;
    const z = props.getPropHeight() * ratio;
    littleManMesh.position.z = z;
    bodyMesh.scale.set(2 - ratio, 2 - ratio, ratio);
    const box = new THREE.Box3();
    const size = new THREE.Vector3();
    box.setFromObject(bodyMesh).getSize(size);
    headerMesh.position.z = headerHeight - (this.littleManBodyHeight - size.z);
  }

  jump() {
    const { littleManMesh, props, headerHeight, littleManBodyHeight, headerMesh, bodyMesh } = this;
    this.isJumping = true;
    littleManMesh.position.z = props.getPropHeight();
    const direction = props.getNewCreateDirection();
    headerMesh.position.z = headerHeight;
    bodyMesh.scale.set(1, 1, 1);
    let animationFrameId;
    const vx = this.strength * Math.cos(this.jumpAngle);
    const vy = this.strength * Math.sin(this.jumpAngle) < 60 ? 60 : this.strength * Math.sin(this.jumpAngle);
    let t = 0;

    const throwLine = () => {
      t = t + 0.3;
      animationFrameId = requestAnimationFrame(throwLine);
      const h = vy * t - 0.5 * this.G * t * t;
      const distance = vx * t - 0.5 * 2 * t * t;
      this.littleManMesh.position.z = props.getPropHeight() + h;
      if (h < 0) {
        this.isJumping = false;
        cancelAnimationFrame(animationFrameId);
        t = 0;
      }
      if (direction === 'right') {
        if (t - 0.3 <= Math.PI * 2) {
          this.littleManMesh.rotation.y = t;
        }
        this.littleManMesh.position.x = this.currentLittleManPosition.x + distance;
      } else if (direction === 'top') {
        if (t - 0.3 <= Math.PI * 2) {
          this.littleManMesh.rotation.x = -t;
        }
        this.littleManMesh.position.y = this.currentLittleManPosition.y + distance;
      }
      this.stage.render();
    };
    throwLine();
  }

  energyStorage() {
    const { props, stage } = this;
    if (this.isJumping) {
      return;
    }
    this.currentLittleManPosition = { ...this.littleManMesh.position };
    const addPrower = () => {
      this.animationFrameId = requestAnimationFrame(addPrower);
      if (this.ratio <= 0.5) {
        cancelAnimationFrame(this.animationFrameId);
        return;
      }
      this.ratio = this.ratio - 0.008;
      this.pressLittleMan();
      props.pressProp(this.ratio);
      stage.render();
    };
    addPrower();
  }

  releasetorage() {
    cancelAnimationFrame(this.animationFrameId);
    const { props, stage, ratio } = this;
    const { prop, key, name } = props.loosenProp();
    if (this.isJumping) {
      return;
    }
    // 小人跳跳
    this.jump();
    // 放松道具
    let times = 0;
    animation(prop, [{ key, name }], {
      duration: 2,
      times: [0, 0.5, 1, 1.5, 2],
      values: [ratio, 1.07, 0.95, 1.01, 1],
      onUpdate: () => {
        stage.render();
      },
      onComplete: () => {
        this.ratio = 1;
      },
    });
    // 创建添加道具
    props.createProp();
  }

  bindEvent() {
    let startTime;
    window.addEventListener('touchstart', () => {
      startTime = Number(new Date());
      this.energyStorage();
    });
    window.addEventListener('touchend', () => {
      let strength = Math.floor((Number(new Date()) - startTime) / 10);
      this.strength = strength > 140 ? 140 : strength;
      this.releasetorage();
    });
  }
}

export default LittleMan;
