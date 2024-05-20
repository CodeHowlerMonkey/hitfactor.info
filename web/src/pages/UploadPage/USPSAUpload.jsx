import { useRef, useState } from "react";
import { Toast } from "primereact/toast";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { postApi } from "../../utils/client";
import UploadResults from "./UploadResults";

const USPSAUpload = () => {
  const toast = useRef(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [memberNumber, setMemberNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <div className="card p-2 w-full md:w-24rem m-auto">
      <Toast ref={toast} />
      <div className="text-center mb-3">
        <div className="text-700 text-2xl font-medium mb-2">Import from USPSA</div>
        <span className="text-600 font-medium text-sm">
          Use your USPSA.org login information to import your classification and scores.
        </span>
      </div>

      <div>
        <InputText
          id="memberNumber"
          type="text"
          placeholder="Member Number"
          className="w-full mb-3"
          value={memberNumber}
          onChange={(e) => setMemberNumber(e.target.value)}
        />
        <InputText
          type="password"
          placeholder="Password"
          className="w-full mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button
          label="Import"
          icon="pi pi-download md:text-4xl md:pl-3 lg:text-base lg:p-0"
          className="w-full"
          loading={loading}
          onClick={async () => {
            if (!memberNumber || !password) {
              return;
            }
            setLoading(true);
            setError(null);
            setResult(null);
            const apiResponse = await postApi("/upload/uspsa", {
              memberNumber,
              password,
            });

            setLoading(false);
            if (apiResponse.result) {
              setMemberNumber("");
              setPassword("");
              setResult(apiResponse.result);
              toast.current.show({
                severity: "success",
                summary: "Import Complete",
                detail: apiResponse?.result?.message,
                life: 3000,
              });
            } else {
              setError(apiResponse.error);
              setPassword("");
              toast.current.show({
                severity: "error",
                summary: "Import Failed",
                detail: apiResponse?.error?.message,
                life: 5000,
              });
            }
          }}
        />
      </div>
      <div className="flex flex-column">
        <UploadResults
          {...{ error, result, loading }}
          successMessage="Import Complete!"
        />
      </div>
    </div>
  );
};

export default USPSAUpload;
