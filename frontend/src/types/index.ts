export interface PixelData {
  id:        number;
  color:     number;   // RGB as uint24 (0xRRGGBB)
  painter:   string;   // wallet address or "0x000...000" for uncolored
  timestamp: number;   // unix timestamp
}

export interface PixelEvent {
  id:        number;
  pixelId:   number;
  painter:   string;
  color:     number;
  timestamp: number;
  x:         number;
  y:         number;
}

export interface ViewState {
  offsetX:  number; // canvas pan X
  offsetY:  number; // canvas pan Y
  scale:    number; // zoom level (1 = 1px per pixel)
}

export interface SelectedPixel {
  pixelId: number;
  x:       number;
  y:       number;
  data?:   PixelData;
}

export interface ColorPickerState {
  open:       boolean;
  pixelId:    number;
  x:          number;
  y:          number;
  screenX:    number;
  screenY:    number;
}
