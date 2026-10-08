import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

// The Addis AI mark is white on transparent, so it is drawn on the brand blue
// to stay visible on light browser tabs and in link-preview cards.
export async function brandIcon(size: number) {
  const mark = await readFile(join(process.cwd(), 'public/images/addis-logo.png'));
  const src = `data:image/png;base64,${mark.toString('base64')}`;
  const markSize = Math.round(size * 0.72);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#245efe',
          borderRadius: Math.round(size * 0.22),
        }}
      >
        {/* ImageResponse renders plain <img>; next/image is not supported here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={markSize} height={markSize} alt="" />
      </div>
    ),
    { width: size, height: size },
  );
}
