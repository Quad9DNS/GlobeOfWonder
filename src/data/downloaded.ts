import { LayerData, PointData, ScaleData } from ".";
import { CommonData } from "./common";
import { LabelsData } from "./label";
import { LinkData } from "./link";
import { HoverTextData } from "./hover";
import { CounterData, LifetimeData, PositionData } from "../service/data";

/**
 * Additional data that can be used to customize downloaded objects (images).
 */
export interface DownloadedCustomizationData {
  /**
   * URL to download the image from.
   */
  downloaded_object_url: string;
  /**
   * Relative scale for the image.
   */
  downloaded_object_scale?: number;
}

/**
 * Data representing a single downloaded image on the globe
 */
export class DownloadedData
  extends CommonData<DownloadedCustomizationData>
  implements
    DownloadedCustomizationData,
    PointData,
    LabelsData,
    LinkData,
    ScaleData,
    HoverTextData
{
  /**
   * Cached image data - should be set after downloading. The object should not be displayed before this is set.
   */
  public image_data: ImageBitmap | null = null;

  constructor(
    data: PositionData &
      CounterData &
      LifetimeData &
      DownloadedCustomizationData &
      LabelsData &
      LinkData &
      LayerData &
      ScaleData &
      HoverTextData,
  ) {
    super(data);
  }

  public get downloaded_object_url(): string {
    return this.additional_data.downloaded_object_url;
  }
  public get downloaded_object_scale(): number | undefined {
    return this.additional_data.downloaded_object_scale;
  }

  scale(): number {
    return this.downloaded_object_scale ?? 1;
  }

  clone(): DownloadedData {
    return new DownloadedData(this.cloneData());
  }

  labelScale(): number {
    return this.scale();
  }
}
