import { Grid, VStack } from '@kuma-ui/core';

export const HomePage = () => {
  return (
    <VStack gap={24}>
      <Grid gridTemplateColumns="repeat(auto-fit, minmax(260px, 1fr))">
        <a href="/?v=big_buck_bunny">Big Buck Bunny</a>
      </Grid>
    </VStack>
  );
};
