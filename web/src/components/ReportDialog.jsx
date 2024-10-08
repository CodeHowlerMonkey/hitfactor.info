import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputTextarea } from "primereact/inputtextarea";
import { Toast } from "primereact/toast";
import { useCallback, useRef, useState, useImperativeHandle, forwardRef } from "react";

import { postApi } from "../utils/client";

const renderField = (value, fieldName) => {
  if (!value) {
    return value;
  }

  switch (fieldName) {
    case "sd": {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return null;
      }

      return date.toLocaleDateString("en-us", { timeZone: "UTC" });
    }

    case "hf":
      return `HF ${value}`;

    case "division":
      return value.toUpperCase();

    case "percent":
    case "recPercent":
    case "curPercent":
      return `${Number(value).toFixed(2)}%`;

    default:
      return value;
  }
};

const reportDocRenderFields = [
  "sd",
  "memberNumber",
  "name",
  "division",
  "classifier",
  "hf",
  "recPercent",
];
const reportDocSendFields = [
  ...reportDocRenderFields,
  "clubid",
  "club_name",
  "percent",
  "_id",
];

export const ReportDialog = forwardRef(({ type }, ref) => {
  const toast = useRef(null);
  const [visible, setVisible] = useState(false);
  const [sending, setSending] = useState(false);
  const [comment, setComment] = useState("");
  const [doc, setDoc] = useState(null);
  const [reason, setReason] = useState(null);
  const reasons = [
    type === "Score" && { name: "Suspicious Score", code: "sus" },
    { name: `Duplicate ${type}`, code: "dupe" },
    type === "Shooter" && { name: "Known Cheater", code: "cheat" },
    { name: "Bad Data", code: "bad" },
  ].filter(Boolean);

  useImperativeHandle(
    ref,
    () => ({
      startReport: newDoc => {
        setComment("");
        setReason(null);
        setDoc(newDoc);
        setSending(false);
        setVisible(true);
      },
    }),
    [],
  );
  const reportDocRender = reportDocRenderFields
    .map(key => renderField(doc?.[key], key))
    .filter(Boolean)
    .join(" - ");

  const handleSendReport = useCallback(async () => {
    setSending(true);

    const reportDoc = Object.fromEntries(
      Object.entries(doc || {}).filter(([key]) => reportDocSendFields.includes(key)),
    );
    reportDoc.url = location.toString();
    reportDoc.reason = reason?.code;
    reportDoc.comment = comment;
    reportDoc.type = type;

    try {
      await postApi("/report", reportDoc);
      setVisible(false);
      setSending(false);
      toast.current.show({
        severity: "success",
        summary: "Report Sent",
        detail: (
          <>
            <div>{reason?.name}:</div>
            <div>{reportDocRender}</div>
            <br />
            <div>Comments:</div>
            <div>{comment}</div>
          </>
        ),
        life: 3000,
      });
    } catch (e) {
      setSending(false);
      toast.current.show({
        severity: "error",
        summary: "Error Sending Report",
        detail: e.toString(),
        life: 5000,
      });
    }
  }, [toast, reason?.code, comment, doc, setVisible]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Toast ref={toast} />
      <Dialog
        visible={visible}
        onHide={() => setVisible(false)}
        header={`Report ${type}`}
        contentClassName="px-0 md:px-4 pb-4"
        headerClassName="pb-0"
      >
        <div
          className="flex flex-column align-items-center pt-4 mx-1 gap-4"
          style={{ marginLeft: "-1rem", width: "calc(min(30em, 80vw))" }}
        >
          <div className="w-full max-w-full text-xs md:text-sm text-500 text-center">
            {reportDocRender}
          </div>
          <div className="w-full max-w-full">
            <Dropdown
              placeholder="Reason"
              value={reason}
              onChange={e => setReason(e.value)}
              options={reasons}
              optionLabel="name"
              className="w-full"
            />
          </div>
          <div className="w-full">
            <InputTextarea
              className="w-full"
              placeholder="Comments / Explanation"
              style={{
                minHeight: "10em",
              }}
              id="reportComment"
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
          </div>
          <div className="flex gap-4 w-12">
            <div className="flex-grow-1" />
            <Button
              label="Cancel"
              text
              className="ml-auto"
              onClick={() => setVisible(false)}
            />
            <Button
              loading={sending}
              label="Send Report"
              disabled={!reason || !comment}
              onClick={handleSendReport}
            />
          </div>
        </div>
      </Dialog>
    </>
  );
});

export const ReportButton = ({ onClick }) => (
  <Button
    icon="pi pi-flag text-xs md:text-base"
    size="small"
    style={{ width: "1em" }}
    onClick={onClick}
    text
  />
);

ReportDialog.Button = ReportButton;

export default ReportDialog;
