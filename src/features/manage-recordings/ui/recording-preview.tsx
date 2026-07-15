import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useVideoPlayer, VideoView, type VideoContentFit } from 'expo-video';

type RecordingPreviewProps = {
  contentFit?: VideoContentFit;
  muted: boolean;
  nativeControls?: boolean;
  style?: StyleProp<ViewStyle>;
  uri: string;
};

export function RecordingPreview({
  contentFit = 'cover',
  muted,
  nativeControls = false,
  style,
  uri,
}: RecordingPreviewProps) {
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = muted;
    videoPlayer.play();
  });

  return (
    <VideoView
      allowsPictureInPicture={false}
      contentFit={contentFit}
      nativeControls={nativeControls}
      player={player}
      style={[StyleSheet.absoluteFill, style]}
    />
  );
}
