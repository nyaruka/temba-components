import { assert, expect } from '@open-wc/testing';
import { Thumbnail } from '../src/display/Thumbnail';
import { getComponent } from './utils.test';

const TAG = 'temba-thumbnail';
const getThumbnail = async (attrs: any = {}) => {
  return (await getComponent(TAG, attrs)) as Thumbnail;
};

describe('temba-thumbnail', () => {
  it('can be created', async () => {
    const thumbnail = await getThumbnail();
    assert.instanceOf(thumbnail, Thumbnail);
  });

  it('renders location thumbnail with map tile', async () => {
    // test that a location attachment properly uses latLngToTile in render
    const thumbnail = await getThumbnail({
      attachment: 'geo:40.7128,-74.0060'
    });
    await thumbnail.updateComplete;

    expect(thumbnail.latitude).to.equal(40.7128);
    expect(thumbnail.longitude).to.equal(-74.0060);
    expect(thumbnail.contentType).to.equal('location');

    // verify the rendered image contains the correct tile URL
    const img = thumbnail.shadowRoot.querySelector('img');
    expect(img).to.exist;
    expect(img.src).to.include('tile.openstreetmap.org');
    expect(img.src).to.include('/13/'); // zoom level
  });

  describe('latLngToTile', () => {
    it('converts coordinates at 0,0', async () => {
      const thumbnail = await getThumbnail();
      
      // test at zoom level 0
      const tile0 = (thumbnail as any).latLngToTile(0, 0, 0);
      expect(tile0.x).to.equal(0);
      expect(tile0.y).to.equal(0);
      expect(tile0.z).to.equal(0);

      // test at zoom level 10
      const tile10 = (thumbnail as any).latLngToTile(0, 0, 10);
      expect(tile10.x).to.equal(512);
      expect(tile10.y).to.equal(512);
      expect(tile10.z).to.equal(10);
    });

    it('converts positive coordinates', async () => {
      const thumbnail = await getThumbnail();
      
      // test London coordinates at zoom 13
      const londonTile = (thumbnail as any).latLngToTile(51.5074, -0.1278, 13);
      expect(londonTile.x).to.equal(4093);
      expect(londonTile.y).to.equal(2724);
      expect(londonTile.z).to.equal(13);
    });

    it('converts negative coordinates', async () => {
      const thumbnail = await getThumbnail();
      
      // test Sydney coordinates (negative latitude) at zoom 13
      const sydneyTile = (thumbnail as any).latLngToTile(-33.8688, 151.2093, 13);
      expect(sydneyTile.x).to.equal(7536);
      expect(sydneyTile.y).to.equal(4915);
      expect(sydneyTile.z).to.equal(13);
    });

    it('converts coordinates near the North Pole', async () => {
      const thumbnail = await getThumbnail();
      
      // test near North Pole (85.05 is practical limit for Web Mercator)
      const northPoleTile = (thumbnail as any).latLngToTile(85, 0, 5);
      expect(northPoleTile.x).to.equal(16);
      expect(northPoleTile.y).to.equal(0);
      expect(northPoleTile.z).to.equal(5);
    });

    it('converts coordinates near the South Pole', async () => {
      const thumbnail = await getThumbnail();
      
      // test near South Pole (-85.05 is practical limit for Web Mercator)
      const southPoleTile = (thumbnail as any).latLngToTile(-85, 0, 5);
      expect(southPoleTile.x).to.equal(16);
      expect(southPoleTile.y).to.equal(31);
      expect(southPoleTile.z).to.equal(5);
    });

    it('converts coordinates near the Date Line (positive)', async () => {
      const thumbnail = await getThumbnail();
      
      // test near Date Line (179.9 longitude)
      const dateLineTile = (thumbnail as any).latLngToTile(0, 179.9, 10);
      expect(dateLineTile.x).to.equal(1023);
      expect(dateLineTile.y).to.equal(512);
      expect(dateLineTile.z).to.equal(10);
    });

    it('converts coordinates near the Date Line (negative)', async () => {
      const thumbnail = await getThumbnail();
      
      // test near Date Line (-179.9 longitude)
      const dateLineTile = (thumbnail as any).latLngToTile(0, -179.9, 10);
      expect(dateLineTile.x).to.equal(0);
      expect(dateLineTile.y).to.equal(512);
      expect(dateLineTile.z).to.equal(10);
    });

    it('works correctly with zoom level 1', async () => {
      const thumbnail = await getThumbnail();
      
      const tile = (thumbnail as any).latLngToTile(40.7128, -74.0060, 1);
      expect(tile.x).to.equal(0);
      expect(tile.y).to.equal(0);
      expect(tile.z).to.equal(1);
    });

    it('works correctly with zoom level 5', async () => {
      const thumbnail = await getThumbnail();
      
      const tile = (thumbnail as any).latLngToTile(40.7128, -74.0060, 5);
      expect(tile.x).to.equal(9);
      expect(tile.y).to.equal(12);
      expect(tile.z).to.equal(5);
    });

    it('works correctly with zoom level 15', async () => {
      const thumbnail = await getThumbnail();
      
      const tile = (thumbnail as any).latLngToTile(40.7128, -74.0060, 15);
      expect(tile.x).to.equal(9647);
      expect(tile.y).to.equal(12320);
      expect(tile.z).to.equal(15);
    });

    it('works correctly with zoom level 18 (maximum)', async () => {
      const thumbnail = await getThumbnail();
      
      const tile = (thumbnail as any).latLngToTile(40.7128, -74.0060, 18);
      expect(tile.x).to.equal(77182);
      expect(tile.y).to.equal(98561);
      expect(tile.z).to.equal(18);
    });
  });
});
