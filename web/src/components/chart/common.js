import { Scatter, Line } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import "chartjs-adapter-date-fns";
Chart.register(...registerables);
Chart.register(annotationPlugin);

export { Scatter, Line };
