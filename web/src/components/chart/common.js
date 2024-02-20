import { Scatter } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
Chart.register(...registerables);
Chart.register(annotationPlugin);

export { Scatter };
