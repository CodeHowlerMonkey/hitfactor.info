import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { useState } from "react";

import { postApi } from "../../utils/client";

import UploadResults from "./UploadResults";

const USPSAUpload = () => {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [memberNumber, setMemberNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <div className="card p-2 w-full md:w-24rem m-auto">
      <div className="text-center mb-3">
        <div className="text-700 text-2xl font-medium mb-2">Import from USPSA</div>
        <span className="text-600 font-medium text-sm">
          Use your USPSA.org login information to import your classification and scores.
        </span>
      </div>

      <form onSubmit={e => e.preventDefault()}>
        <InputText
          id="memberNumber"
          type="text"
          placeholder="Member Number"
          className="w-full mb-3"
          value={memberNumber}
          onChange={e => setMemberNumber(e.target.value)}
        />
        <InputText
          type="password"
          placeholder="Password"
          className="w-full mb-4"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <Button
          type="submit"
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
            } else {
              setError(apiResponse.error);
              setPassword("");
            }
          }}
        />
      </form>
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
