import { MeshGradient } from '@paper-design/shaders-react';

const COLORS = ['#EB4679', '#051681', '#7961D3', '#C25EA5'];

export default function MeshGradientHero() {
  return (
    <MeshGradient
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      colors={COLORS}
      distortion={0.8}
      swirl={0.1}
      speed={0.3}
    />
  );
}
