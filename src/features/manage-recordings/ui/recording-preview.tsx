import { useEffect } from 'react';
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

  useEffect(() => {
    // expo-video players are mutable native handles; property assignment is the documented API.
    // eslint-disable-next-line react-hooks/immutability
    player.muted = muted;
  }, [muted, player]);

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
