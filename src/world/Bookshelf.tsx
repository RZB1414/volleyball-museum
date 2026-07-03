import { useGLTF } from '@react-three/drei'
import { GroundedModel } from './GroundedModel'

const BOOKSHELF_MODEL_PATH = '/models/escritorio/Meshy_AI_Ornate_Carved_Mahogan_0703074833_texture.glb'
// Tall enough to read as a real piece of furniture against the room's 4m ceiling.
const BOOKSHELF_HEIGHT = 3.0

type Vector3Tuple = [number, number, number]

type BookshelfProps = {
  position: Vector3Tuple
  rotation?: Vector3Tuple
}

export function Bookshelf(props: BookshelfProps) {
  return <GroundedModel modelPath={BOOKSHELF_MODEL_PATH} targetHeight={BOOKSHELF_HEIGHT} {...props} />
}

useGLTF.preload(BOOKSHELF_MODEL_PATH)
