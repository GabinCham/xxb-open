const PACK_TEXTURES: Record<string, number> = {
  op01: require('../../assets/packs/op01.jpg'),
  op02: require('../../assets/packs/op02.jpg'),
  op03: require('../../assets/packs/op03.jpg'),
  op05: require('../../assets/packs/op05.jpg'),
  op06: require('../../assets/packs/op06.jpg'),
  op09: require('../../assets/packs/op09.jpg'),
  eb01: require('../../assets/packs/eb01.jpg'),
  op13: require('../../assets/packs/op13.jpg'),
  'op13-hits': require('../../assets/packs/op13.jpg'),
  op14: require('../../assets/packs/op14.jpg'),
  op15: require('../../assets/packs/op15.jpg'),
  op16: require('../../assets/packs/op16.jpg'),
  op17: require('../../assets/packs/op17.jpg'),
};

export function packTextureModule(setId: string): number | undefined {
  return PACK_TEXTURES[setId];
}
