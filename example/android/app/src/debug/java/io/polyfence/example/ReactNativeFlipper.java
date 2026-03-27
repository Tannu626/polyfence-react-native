package io.polyfence.example;

import android.content.Context;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.common.build.ReactBuildConfig;

public class ReactNativeFlipper {
  public static void initializeFlipper(Context context, ReactInstanceManager reactInstanceManager) {
    if (ReactBuildConfig.DEBUG) {
      try {
        Class<?> aClass = Class.forName("com.facebook.flipper.android.AndroidFlipperClient");
        aClass.getMethod("getInstance", Context.class)
            .invoke(null, context);
        Class<?> rn = Class.forName("com.facebook.flipper.plugins.react.ReactFlipperPlugin");
        rn.getMethod("onDebuggerConnected").invoke(null);
      } catch (ClassNotFoundException e) {
        // pass
      } catch (Exception e) {
        // ignore
      }
    }
  }
}
