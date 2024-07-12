import { ByteBuffer, compileSchema, decodeBinarySchema } from "kiwi-schema"
import * as UZIP from "uzip"
import _ from 'lodash'
import fs from 'fs'
import path from 'path'
import { schemaData } from './schema'

const transfer8to32 = function (fileByte: Uint8Array, start: number, cache: Uint8Array) {
  cache[0] = fileByte[start + 0]
  cache[1] = fileByte[start + 1]
  cache[2] = fileByte[start + 2]
  cache[3] = fileByte[start + 3]
}

const int32 = new Int32Array(1)
const uint8 = new Uint8Array(int32.buffer)
const uint32 = new Uint32Array(int32.buffer)

const calcEnd = function (fileByte: Uint8Array, start: number) {
  transfer8to32(fileByte, start, uint8)
  return uint32[0]
}

const figToJson = (fileBuffer: Buffer | ArrayBuffer): object => {
  const [schemaByte, dataByte] = figToBinaryParts(fileBuffer)

  const schemaBB = new ByteBuffer(schemaByte)
  const schema = decodeBinarySchema(schemaBB)
  const dataBB = new ByteBuffer(dataByte)
  const schemaHelper = compileSchema(schema)
  const json = schemaHelper[`decodeMessage`](dataBB)
  return convertBlobsToBase64(json)
}

function convertBlobsToBase64(json: any): object {
  if (!json.blobs) return json

  return {
    ...json,
    blobs: json.blobs.map((blob: any) => {
      return btoa(String.fromCharCode(...blob.bytes))
    })
  }
}

function convertBase64ToBlobs(json: any): object {
  if (!json.blobs) return json

  return {
    ...json,
    blobs: json.blobs.map((blob: any) => {
      return { bytes: Uint8Array.from(atob(blob), (c) => c.charCodeAt(0)) }
    })
  }
}

function fixUnitArray(json: any) {
  if (typeof json === 'object' && json !== null) {
    for (const key in json) {
      if (key === 'fontDigest') {
        json[key] = new Uint8Array(Object.values(json[key]))
        return;
      }
      if (Object.prototype.hasOwnProperty.call(json, key)) {
        fixUnitArray(json[key])
      }
    }
  }
}

const jsonToFig = (json: any): Uint8Array => {
  const schemaByte = new Uint8Array(schemaData);

  const schemaBB = new ByteBuffer(schemaByte)
  const schema = decodeBinarySchema(schemaBB)
  const schemaHelper = compileSchema(schema)

  fixUnitArray(json)
  const encodedData = schemaHelper[`encodeMessage`](convertBase64ToBlobs(json))
  const encodedDataCompressed = UZIP.deflateRaw(encodedData)
  const encodedDataCompressedSize = encodedDataCompressed.length
  const encodedDataCompressedPadding = 4 - (encodedDataCompressedSize % 4)
  const encodedDataCompressedSizeWithPadding =
    encodedDataCompressedSize + encodedDataCompressedPadding

  const schemaBytesCompressed = UZIP.deflateRaw(schemaByte)
  const schemaSize = schemaBytesCompressed.length
  const schemaPadding = 4 - (schemaSize % 4)
  const schemaSizeWithPadding = schemaSize + schemaPadding

  const result = new Uint8Array(
    8 + 4 + (4 + schemaSizeWithPadding) + (4 + encodedDataCompressedSizeWithPadding)
  )

  // fig-kiwi comment
  result[0] = 102
  result[1] = 105
  result[2] = 103
  result[3] = 45
  result[4] = 107
  result[5] = 105
  result[6] = 119
  result[7] = 105

  // delimiter word
  result[8] = 0x0f
  result[9] = 0x00
  result[10] = 0x00
  result[11] = 0x00

  uint32[0] = schemaSizeWithPadding

  // schema length
  result[12] = uint8[0]
  result[13] = uint8[1]
  result[14] = uint8[2]
  result[15] = uint8[3]

  // transfer encoded schema to result
  result.set(schemaBytesCompressed, 16)

  // data length
  uint32[0] = encodedDataCompressedSizeWithPadding

  result[16 + schemaSizeWithPadding] = uint8[0]
  result[17 + schemaSizeWithPadding] = uint8[1]
  result[18 + schemaSizeWithPadding] = uint8[2]
  result[19 + schemaSizeWithPadding] = uint8[3]

  result.set(encodedDataCompressed, 16 + schemaSizeWithPadding + 4)

  return result
}

function figToBinaryParts(fileBuffer: ArrayBuffer | Buffer): Uint8Array[] {
  let fileByte: Uint8Array = new Uint8Array(fileBuffer)

  if (
    fileByte[0] !== 102 ||
    fileByte[1] !== 105 ||
    fileByte[2] !== 103 ||
    fileByte[3] !== 45 ||
    fileByte[4] !== 107 ||
    fileByte[5] !== 105 ||
    fileByte[6] !== 119 ||
    fileByte[7] !== 105
  ) {
    const unzipped = UZIP.parse(fileBuffer)
    const file = unzipped["canvas.fig"]
    fileBuffer = file.buffer
    fileByte = new Uint8Array(fileBuffer)
  }

  let start = 8

  calcEnd(fileByte, start)
  start += 4

  const result: Uint8Array[] = []
  while (start < fileByte.length) {
    let end = calcEnd(fileByte, start)
    start += 4

    let byteTemp = fileByte.slice(start, start + end)

    if (!(fileByte[start] == 137 && fileByte[start + 1] == 80)) {
      byteTemp = UZIP.inflateRaw(byteTemp)
    }

    result.push(byteTemp)
    start += end
  }

  return result
}



export const toJSON = (filePath: string) => {
  const dir = path.dirname(filePath);
  const name = path.basename(filePath).split('.')[0];
  const fileBuffer = fs.readFileSync(filePath)
  const json = figToJson(fileBuffer)
  fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(json, undefined, 2))
}
export const toFig = (filePath: string) => {
  const dir = path.dirname(filePath);
  const name = path.basename(filePath).split('.')[0];
  const fileStr = fs.readFileSync(filePath, {
    encoding: 'utf8'
  })
  const fig = jsonToFig(JSON.parse(fileStr))
  fs.writeFileSync(path.join(dir, `${name}.fig`), fig)
}