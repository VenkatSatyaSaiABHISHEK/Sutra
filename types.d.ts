declare namespace JSX {
  interface IntrinsicElements {
    'dotlottie-wc': DotLottieProps;
  }
}

interface DotLottieProps {
  src: string;
  autoplay?: boolean;
  loop?: boolean;
  style?: React.CSSProperties;
  [key: string]: any;
}
