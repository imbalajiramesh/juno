import Avatar, { genConfig } from 'react-nice-avatar'

const config = {
  "sex": "man",
  "faceColor": "#F9C9B6",
  "earSize": "big",
  "eyeStyle": "oval",
  "noseStyle": "short",
  "mouthStyle": "peace",
  "shirtStyle": "polo",
  "glassesStyle": "none",
  "hairColor": "#000",
  "hairStyle": "mohawk",
  "hatStyle": "none",
  "hatColor": "#77311D",
  "eyeBrowStyle": "up",
  "shirtColor": "#77311D",
  "bgColor": "#FFEDEF"
}
  const myConfig = genConfig(config);

  export default function NiceAvatar() {
    return <Avatar style={{ width: '2rem', height: '2rem' }} {...myConfig} />
  }

  