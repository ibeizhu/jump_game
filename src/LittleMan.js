import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils';
import { animation } from './lib';
import { Animation } from './lib/animation';
import { getVectorAngle, subtract } from './lib/math';

class LittleMan {
  constructor({ world, canvas, props, height, width, color = 0x386899 }) {
    this.stage = null;
    this.props = props;
    this.canvas = canvas;
    this.height = height;
    this.width = width;
    this.world = world;
    this.color = color;
    this.isJumping = false;
    this.jumpAngle = Math.PI / 4;
    this.strength = 0;
    this.isDeath = false;
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
    const bodyBottomRadius = (this.bodyBottomRadius = width * 0.06);
    const bodyBottomGeo = new THREE.CylinderGeometry(
      width * 0.03,
      bodyBottomRadius,
      Math.floor((width * 3) / 21),
      50,
      50
    );
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
  }

  enterStage(stage) {
    const { props, littleManMesh } = this;
    this.stage = stage;
    littleManMesh.position.z = props.getPropHeight();
    stage.add(littleManMesh);
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

  jump(onComplete = () => {}) {
    const { littleManMesh, props, headerHeight, headerMesh, bodyMesh } = this;
    this.isJumping = true;
    littleManMesh.position.z = props.getPropHeight();
    const direction = props.getNewCreateDirection();
    const angle = this.getJumpdirectionAngle();
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
      if (h < 0) {
        this.isJumping = false;
        cancelAnimationFrame(animationFrameId);
        onComplete && onComplete();
        t = 0;
      }
      const { x, y } = this.currentLittleManPosition;
      if (direction === 'right') {
        this.littleManMesh.position.set(
          x + distance * Math.cos(angle),
          y + distance * Math.sin(angle),
          props.getPropHeight() + h
        );
        if (t - 0.3 <= Math.PI * 2) {
          this.littleManMesh.rotation.y = t;
        }
      } else if (direction === 'top') {
        this.littleManMesh.position.set(
          x - distance * Math.sin(angle),
          y + distance * Math.cos(angle),
          props.getPropHeight() + h
        );
        if (t - 0.3 <= Math.PI * 2) {
          this.littleManMesh.rotation.x = -t;
        }
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

    // 小人跳跃
    this.jump(() => {
      // 判断死没死
      if (!this.judgeIsDeath()) {
        // 跳跃结束添加道具
        const box = props.createProp();
        props.enterStage(box);
        stage.moveCamera();
      }
    });

    // 放松道具
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
  }

  getJumpdirectionAngle() {
    const { props, currentLittleManPosition } = this;
    const targetPropPosition = props.getNextProp()?.position;
    const directionVector3 = subtract(targetPropPosition, currentLittleManPosition);
    // 设置一下最终目标的z为0
    directionVector3.z = 0;
    const direction = props.getNewCreateDirection();
    let angle;
    let baseVector = direction === 'top' ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
    angle = getVectorAngle(baseVector, directionVector3);
    return angle;
  }

  judgeIsDeath() {
    let isDeath = true;
    const { props, littleManMesh, bodyBottomRadius, stage } = this;
    const prop = props.getNextProp();
    const box = new THREE.Box3();
    const size = new THREE.Vector3();
    box.setFromObject(prop).getSize(size);
    const { x: manPosX, y: manPosY, z: manPosZ } = littleManMesh.position;
    const { x, y } = prop.position;
    const w = size.x / 2;
    const propTopPoint = y + w;
    const propBottomPoint = y - w;
    const propLeftPoint = x - w;
    const propRightPoint = x + w;
    if (
      manPosX >= propLeftPoint &&
      manPosX <= propRightPoint &&
      manPosY >= propBottomPoint &&
      manPosY <= propTopPoint
    ) {
      isDeath = false;
    } else if (
      manPosX <= propLeftPoint - bodyBottomRadius ||
      manPosX >= propRightPoint + bodyBottomRadius ||
      manPosY >= propTopPoint + bodyBottomRadius ||
      manPosY <= propBottomPoint - bodyBottomRadius
    ) {
      new Animation({
        duration: 200,
        iterations: 1,
      }).animate(
        {
          el: littleManMesh,
          start: manPosZ,
          end: 0,
        },
        ({ target: { el, start, end }, timing: { p } }) => {
          el.position.z = start * (1 - p) + end * p;
          stage.render();
        }
      );
    } else {
      const layDirection = [
        manPosY > propTopPoint,
        manPosY > propRightPoint,
        manPosY < propBottomPoint,
        manPosX < propLeftPoint,
      ]; // ['top', 'right', 'bottom', 'left'];
      console.log(layDirection);
      new Animation({
        duration: 500,
        iterations: 1,
      }).animate(
        {
          el: littleManMesh,
          start: manPosZ,
          end: 0,
        },
        ({ target: { el, start, end }, timing: { p } }) => {
          el.position.z = start * (1 - p) + end * p;
          if (layDirection[0] || layDirection[2]) {
            el.rotation.x = p * (layDirection[0] ? -1 : 1) * Math.PI / 2;
          } else if (layDirection[1] || layDirection[3]) {
            el.rotation.y = p * (layDirection[1] ? 1 : -1) * Math.PI / 2;
          }
          stage.render();
        }
      );
    }
    this.isDeath = isDeath;
    return isDeath;
  }

  bindEvent() {
    let startTime;
    window.addEventListener('touchstart', () => {
      if (this.isDeath) {
        console.log('death');
        return;
      }
      startTime = Number(new Date());
      this.energyStorage();
    });
    window.addEventListener('touchend', () => {
      if (this.isDeath) {
        console.log('death');
        return;
      }
      let strength = Math.floor((Number(new Date()) - startTime) / 10);
      this.strength = strength > 140 ? 140 : strength;
      this.releasetorage();
    });
  }
}

export default LittleMan;
